import * as LJS from "littlejsengine";

import { BulletClass } from "./Bullet.js";
import { IsGameEnded } from "./game.js";
import { Guideline } from "./guideline.js";
import { PlayerStats } from "./PlayerStats.js";
import { Sprites } from "./Sprites.js";

// --------------------------------------------------
// PLAYER SPRITE SETTINGS
// --------------------------------------------------

// SET THESE to where your player sheet and JSON really live.
const PLAYER_IMAGE = "/assets/playerSprite/playerSprite.png";
const PLAYER_JSON = "/assets/playerSprite/spritesheet.json";

const shootSound = new LJS.Sound("/assets/sounds/shoot.mp3");

// Each frame in the JSON is 313 x 207 pixels.
const PLAYER_FRAME_W = 313;
const PLAYER_FRAME_H = 207;

// How wide the player is drawn in world units (height follows the aspect ratio).
const PLAYER_SPRITE_WIDTH = 3;

// Seconds per animation frame.
const PLAYER_ANIM_SPEED = 0.06;

// Which way the sprite faces in the art, expressed as a rotation fix.
//   faces RIGHT -> -Math.PI / 2   (default)
//   faces UP    ->  0
//   faces LEFT  ->  Math.PI / 2
//   faces DOWN  ->  Math.PI
// If the player points the wrong way, change this one value.
const PLAYER_ANGLE_OFFSET = -Math.PI / 2 - (7 * Math.PI) / 180;

// Loaded once and shared. Resolves to an array of TileInfo frames.
let playerFramesPromise = null;
function loadPlayerFrames() {
  if (playerFramesPromise) return playerFramesPromise;

  playerFramesPromise = (async () => {
    const probe = new Image();
    probe.src = PLAYER_IMAGE;
    await probe.decode();

    const sheet = LJS.loadSprite(
      PLAYER_IMAGE,
      LJS.vec2(probe.naturalWidth, probe.naturalHeight),
    );

    const json = await (await fetch(PLAYER_JSON)).json();

    await LJS.spritesReady();

    const frames = json.frames
      .slice()
      .sort((a, b) => {
        const numA = Number(a.filename.split("_").pop());
        const numB = Number(b.filename.split("_").pop());
        return numA - numB;
      })
      .map((f) => {
        return new LJS.TileInfo(
          LJS.vec2(f.frame.x, f.frame.y),
          LJS.vec2(f.frame.w, f.frame.h),
          sheet.textureInfo,
        );
      });

    console.log("Loaded player frames:", frames.length);

    return frames;
  })();

  return playerFramesPromise;
}
// --------------------------------------------------
// PLAYER HEALTH
// --------------------------------------------------

export let PlayerHealth = 100;

// Kept so other files that still import these don't break.
// Bounce count now comes from PlayerStats (bulletStats.bounceThreshold).
export let Bounces = 3;
const MaxBounces = 6;

export function IncrBounces() {
  if (Bounces < MaxBounces) {
    Bounces++;
  }
}

export function DecrBounces() {
  if (Bounces > 0) {
    Bounces--;
  }
}

// Decrease the health of the player.
export function damagePlayer(damage) {
  PlayerHealth = Math.max(0, PlayerHealth - damage);
}

// NOTE: kept exactly as it was on the other branch. Despite the name it ADDS
// to the current health (and never goes below 100). game.js calls it with
// `PlayerHealth + 30`, which therefore doubles the health. If that is not
// intended, change the body to: PlayerHealth = Math.max(0, health);
export function setPlayerHealth(health) {
  PlayerHealth = Math.max(100, PlayerHealth + health);
}

// --------------------------------------------------
// RAY / RECTANGLE INTERSECTION
// --------------------------------------------------

// Finds where a ray hits a rectangle.
// start = ray origin, dir = ray direction, rect = { pos, size }.
// Returns { hit, point, normal, distance } or null if the ray misses.
// If the ray starts inside the rectangle, the exit point is returned
// with normal = null (callers ignore hits without a normal).
export function rayRecHit(start, dir, rect) {
  const halfX = rect.size.x / 2;
  const halfY = rect.size.y / 2;

  const minX = rect.pos.x - halfX;
  const maxX = rect.pos.x + halfX;

  const minY = rect.pos.y - halfY;
  const maxY = rect.pos.y + halfY;

  let tMin = -Infinity;
  let tMax = Infinity;
  let normal = null;

  const axes = [
    [start.x, dir.x, minX, maxX, LJS.vec2(-1, 0), LJS.vec2(1, 0)],
    [start.y, dir.y, minY, maxY, LJS.vec2(0, -1), LJS.vec2(0, 1)],
  ];

  for (const [origin, direction, min, max, negNormal, posNormal] of axes) {
    // Ray is parallel to this axis.
    if (Math.abs(direction) < 1e-8) {
      if (origin < min || origin > max) return null;
      continue;
    }

    let t1 = (min - origin) / direction;
    let t2 = (max - origin) / direction;

    let entryNormal = negNormal;

    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      entryNormal = posNormal;
    }

    if (t1 > tMin) {
      tMin = t1;
      normal = entryNormal;
    }

    tMax = Math.min(tMax, t2);

    if (tMin > tMax) return null;
  }

  if (tMax < 0) return null;

  // If the ray starts inside the rectangle, use the exit point.
  if (tMin < 0) {
    tMin = tMax;
    normal = null;
  }

  return {
    hit: true,
    point: start.add(dir.scale(tMin)),
    normal,
    distance: tMin * dir.length(),
  };
}

// --------------------------------------------------
// PLAYER
// --------------------------------------------------

// The player object inherits functionality from LittleJS.
export class PlayerClass extends LJS.EngineObject {
  // Own copy so changing alpha doesn't affect the shared LJS.GREEN.
  color = LJS.GREEN.copy();

  // Current mouse position in world coordinates.
  mousePosLoc = LJS.vec2(0, 0);

  // Radius used to draw the fallback circle.
  player_size = 0;

  angle_of_trajectory = 0;

  playerStartPos = LJS.vec2(0);

  bullets = [];

  startMoving = false;

  // Lets other code (e.g. enemies) recognise the player.
  isPlayer = true;

  // Upgrades modify this object (fire rate, bullet stats, guideline, ...).
  stats = new PlayerStats();

  fireCooldownRemaining = 0;

  // Set by LevelDesigner while the upgrade menu is open.
  inputLocked = false;

  // Aiming guideline (white line that fades with distance).
  guideline = new Guideline();

  // Sprite animation state.
  playerFrames = [];
  playerFrame = 0;
  playerAnimTimer = 0;

  // Rotation of the sprite toward the mouse.
  aimAngle = 0;

  constructor(pos, p_s) {
    // Initialize the inherited EngineObject at pos.
    super(pos);

    this.player_size = p_s;
    this.playerStartPos = this.pos;

    // Load the sprite frames in the background. Until they arrive,
    // render() draws a green circle instead.
    loadPlayerFrames()
      .then((frames) => {
        this.playerFrames = frames;
      })
      .catch((error) => {
        console.error("Error loading player sprite:", error);
      });
  }

  // Fires bullets according to the player's current stats.
  fireBullet() {
    const bulletStats = this.stats.bulletStats;

    const baseDirection = LJS.mousePos.subtract(this.pos).normalize();

    const count = bulletStats.fireCount;

    shootSound.play(this.pos);

    for (let i = 0; i < count; i++) {
      // Center bullet spread around the mouse direction.
      const offset = (i - (count - 1) / 2) * bulletStats.spreadAngle;

      const direction = baseDirection.rotate((offset * Math.PI) / 180);

      const targetPos = this.pos.add(direction);

      // Create the bullet.
      const bullet = new BulletClass(this.pos, targetPos, this);

      // Copy current player bullet stats.
      bullet.bulletVelocity = bulletStats.velocity;
      bullet.damage = bulletStats.damage;
      bullet.bulletBounceThreshold = bulletStats.bounceThreshold;
      bullet.bulletPierceThreshold = bulletStats.bulletPierceThreshold;

      // Copy effects so future upgrades don't affect existing bullets.
      bullet.effects = [...bulletStats.effects];
      this.stats.totalFiredBullets++;
      this.stats.subBullet();
      this.bullets.push(bullet);
    }
  }

  update() {
    if (IsGameEnded) return;

    // Update mouse position.
    this.mousePosLoc = LJS.mousePos;

    // Count the firing cooldown down. Without this the cooldown never
    // finishes, so fire-rate upgrades would have no effect.
    this.fireCooldownRemaining = Math.max(
      0,
      this.fireCooldownRemaining - LJS.timeDelta,
    );

    // Direction from the player toward the mouse.
    const dir = this.mousePosLoc.subtract(this.pos).normalize();

    if (dir.lengthSquared() > 0) {
      // Angle used to rotate the sprite toward the mouse.
      // LittleJS angles are measured clockwise from "up", which is
      // exactly what vec2.angle() returns.
      this.aimAngle = dir.angle() + PLAYER_ANGLE_OFFSET;

      // Rebuild the aiming guideline.
      this.guideline.update(this.pos, dir, this.stats.guidelineDistance);
    }

    // Advance the idle animation.
    if (this.playerFrames.length) {
      this.playerAnimTimer += LJS.timeDelta;

      while (this.playerAnimTimer >= PLAYER_ANIM_SPEED) {
        this.playerAnimTimer -= PLAYER_ANIM_SPEED;
        this.playerFrame = (this.playerFrame + 1) % this.playerFrames.length;
      }
    }

    // Fire once per click, respecting the cooldown and the upgrade menu.
    if (
      !this.inputLocked &&
      LJS.mouseWasPressed(0) &&
      this.fireCooldownRemaining <= 0
    ) {
      this.fireBullet();
      this.fireCooldownRemaining = this.stats.fireCooldown;
    }
  }

  render() {
    if (IsGameEnded) return;

    this.color.a = Math.min(1, Math.max(0.2, PlayerHealth / 100));

    this.guideline.render();

    if (this.playerFrames.length) {
      const spriteSize = LJS.vec2(
        PLAYER_SPRITE_WIDTH,
        PLAYER_SPRITE_WIDTH * (207 / 313),
      );

      LJS.drawTile(
        this.pos,
        spriteSize,
        Sprites.player.idle[this.playerFrame],
        new LJS.Color(1, 1, 1, this.color.a),
        this.aimAngle,
      );
    } else {
      LJS.drawCircle(this.pos, this.player_size, this.color);
    }

    LJS.drawCircle(this.mousePosLoc, 0.8, LJS.BLACK);
  }
}
