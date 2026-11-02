import * as LJS from "littlejsengine";

import { Enemies, Objects, EneminesEliminated } from "./Objects.js";
import { rayRecHit } from "./player.js";
import { Sprites } from "./Sprites.js";
import {zombieCountIncrease} from './game.js'

// Set to true to log fired bullets, bounces and enemy hits in the console.
const DEBUG_BULLETS = true;

export class BulletClass extends LJS.EngineObject {
  // Direction in which the bullet currently travels.
  direction = LJS.vec2(0, 0);

  // Number of additional enemy hits allowed (set from PlayerStats).
  bulletPierceThreshold = 0;

  // Number of wall bounces allowed (set from PlayerStats).
  bulletBounceThreshold = 2;
  bouncesHappened = 0;

  // The level is in tile units, so this is tiles per second.
  // Overwritten by PlayerStats when the player fires.
  bulletVelocity = 30;
  damage = 500;

  // Special behaviors attached to this bullet.
  effects = [];

  // Reference to the player who fired this bullet.
  player = null;

  lifeTimeOver = false;

  // Enemies this bullet has already hit on its current pass,
  // so a piercing bullet can't hit the same enemy twice.
  hitEnemies = new Set();

  constructor(startPos, targetPos, player = null) {
    super(startPos);

    // Calculate the direction from the start to the target.
    this.direction = targetPos.subtract(startPos).normalize();

    if (DEBUG_BULLETS) {
      console.log(
        "bullet fired at",
        this.pos.x.toFixed(2),
        this.pos.y.toFixed(2),
        "dir",
        this.direction.x.toFixed(2),
        this.direction.y.toFixed(2),
        "colliders:",
        Objects.length,
      );
    }

    this.tileInfo = Sprites.bullet;
    this.player = player;

    this.updateSpriteAngle();
  }

  // Rotate the sprite so it faces the direction of travel.
  updateSpriteAngle() {
    this.angle = this.direction.angle();
  }

  // Notify every attached effect about an event.
  triggerEffects(eventName, ...args) {
    for (const effect of this.effects) {
      if (typeof effect[eventName] === "function") {
        effect[eventName](this, ...args);
      }
    }
  }

  // Allows effects to spawn additional bullets.
  spawnBullet(newBullet) {
    if (this.player) {
      this.player.bullets.push(newBullet);
    }
  }

  // Destroy the bullet exactly once and let effects react.
  destroyBullet() {
    if (this.lifeTimeOver) return;

    this.lifeTimeOver = true;

    this.triggerEffects("onBulletDestroy");

    this.destroy();
  }

  // Apply damage and decide whether the bullet keeps going.
  handleEnemyHit(enemy) {
    this.hitEnemies.add(enemy);

    enemy.color.a -= 0.2;
    enemy.health -= this.damage;

    console.log("Zombie health:", enemy.health);
    console.log("Bullet damage:", this.damage);

    if (DEBUG_BULLETS) {
      console.log(
        `hit enemy ${enemy.id}, health: ${enemy.health}, pierce left: ${this.bulletPierceThreshold}`,
      );
    }

    this.triggerEffects("onEnemyHit", enemy);

    if (enemy.health <= 0 && !EneminesEliminated.has(enemy.id)) {
        EneminesEliminated.set(enemy.id, enemy);
        zombieCountIncrease();
    }

    // Piercing: use up one charge and keep flying through the enemy.
    if (this.bulletPierceThreshold > 0) {
      this.bulletPierceThreshold--;

      // Step just past the entry point.
      this.pos = this.pos.add(this.direction.scale(0.001));

      return;
    }

    // No piercing charges left.
    this.destroyBullet();
  }

  update() {
    if (this.lifeTimeOver) return;

    // How far the bullet can move this frame.
    const movementDistance = this.bulletVelocity * LJS.timeDelta;

    // Remember the current position.
    const start = this.pos;

    // Find the closest collision along the movement path.
    let nearestHit = null;
    let nearestDistance = Infinity;

    // ---------------- ENEMIES ----------------
    // Only choose the nearest hit here. Damage is applied afterwards,
    // so an enemy that is further away than a wall is never hurt.
    for (const enemy of Enemies.values()) {
      if (enemy.health <= 0) continue;
      if (this.hitEnemies.has(enemy)) continue;

      const hit = rayRecHit(start, this.direction, enemy.EnemyHitBox);

      if (!hit || !hit.normal) continue;

      const distance = hit.point.subtract(start).length();

      if (
        distance > 1e-4 &&
        distance <= movementDistance &&
        distance < nearestDistance
      ) {
        nearestDistance = distance;
        nearestHit = { ...hit, isEnemy: true, enemy };
      }
    }

    // ---------------- WALLS ----------------
    for (const rect of Objects) {
      // Enemies may also be stored in Objects. They are handled above
      // (with their hitbox), so they must never act as walls.
      if (rect.type === "_Enemy") continue;

      const hit = rayRecHit(start, this.direction, rect);

      if (!hit || !hit.normal) continue;

      const distance = hit.point.subtract(start).length();

      // Only consider collisions within this frame's movement.
      if (
        distance > 1e-4 &&
        distance <= movementDistance &&
        distance < nearestDistance
      ) {
        nearestDistance = distance;
        nearestHit = hit;
      }
    }

    // No collision: move normally.
    if (!nearestHit) {
      this.pos = start.add(this.direction.scale(movementDistance));
      return;
    }

    // Move the bullet to the collision point.
    this.pos = nearestHit.point;

    // Enemy collision (pierces if the bullet has charges left).
    if (nearestHit.isEnemy) {
      this.handleEnemyHit(nearestHit.enemy);
      return;
    }

    // Wall collision: destroy the bullet if it cannot bounce anymore.
    if (this.bouncesHappened >= this.bulletBounceThreshold) {
      this.destroyBullet();
      return;
    }

    // Reflect the direction using the surface normal.
    this.direction = this.direction
      .subtract(
        nearestHit.normal.scale(2 * this.direction.dot(nearestHit.normal)),
      )
      .normalize();

    this.updateSpriteAngle();

    this.bouncesHappened++;

    // After a bounce the bullet may legitimately hit the same enemy again.
    this.hitEnemies.clear();

    if (DEBUG_BULLETS) {
      console.log(`bullet bounced: ${this.bouncesHappened}`);
    }

    this.triggerEffects("onWallBounce", nearestHit);

    // Move slightly away from the wall to prevent
    // immediately detecting the same collision again.
    this.pos = this.pos.add(nearestHit.normal.scale(0.01));
  }

  render() {
    super.render();
  }
}
