import * as LJS from 'littlejsengine';
import { Enemies, Objects,EneminesEliminated } from './Objects.js';
import { rayRecHit,Bounces } from './player.js'; 
// import { Sprites } from './Sprites.js';

// CHANGED: set to true to log every bounce in the browser console.
const DEBUG_BULLETS = true;
// console.log(Bounces);
export class BulletClass extends LJS.EngineObject {

    // Number of additional enemy hits allowed.
    bulletPierceThreshold = 0;

    // Direction in which the bullet currently travels.
    direction = LJS.vec2(0, 0);

    // Bullet configuration.
    doesPierce = false;
    
    bulletBounceThreshold = Bounces - 1;
    bouncesHappened = 0;

    // CHANGED: was 400. The level is now in tile units (map is 25 x 15 units),
    // so 400 units/s crossed the whole map in ~4 frames and used up all
    // bounces almost instantly. 30 units/s is about 1 second per crossing.
    bulletVelocity = 30; // Units (tiles) per second
    damage = 20;
    effects = [];
    player = null;
    lifeTimeOver = false;
    ignoredEnemy = null;

    constructor(startPos, targetPos,player = null) {
        super(startPos);

        // Calculate the direction from player to mouse.
        this.direction = targetPos
            .subtract(startPos)
            .normalize();

        // CHANGED: log where the bullet starts and which way it goes.
        if (DEBUG_BULLETS)
            console.log(
                'bullet fired at', this.pos.x.toFixed(2), this.pos.y.toFixed(2),
                'dir', this.direction.x.toFixed(2), this.direction.y.toFixed(2),
                'colliders:', Objects.length
            );

            // this.tileInfo = Sprites.bullet;
            this.player = player;

            this.updateSpriteAngle();
    }
    
    updateSpriteAngle() {
        this.angle = this.direction.angle();
    }
    
    isInsideEnemy(point, enemy) {
      const halfSize = enemy.size.scale(0.5);

      return (
        Math.abs(point.x - enemy.pos.x) <= halfSize.x &&
        Math.abs(point.y - enemy.pos.y) <= halfSize.y
      );
    }

    triggerEffects(eventName, ...args) {
      for (const effect of this.effects) {
        if (typeof effect[eventName] === "function") {
          effect[eventName](this, ...args);
        }
      }
    }


    update() {


        if (this.lifeTimeOver){
            return;
        }

        // How far the bullet can move this frame.
        const movementDistance =
            this.bulletVelocity * LJS.timeDelta;

        // Remember the current position.
        const start = this.pos;

        // Find the closest collision along the movement path.
        let nearestHit = null;
        let nearestDistance = Infinity;

        if (this.ignoredEnemy && !this.isInsideEnemy(this.pos, this.ignoredEnemy)) {
            this.ignoredEnemy = null;
        }

        for (const enemy of Enemies.values()) {
            
            const hit = rayRecHit(start, this.direction, enemy.EnemyHitBox);
            
            if (!hit || !hit.normal)
                continue;
            
            const distance = hit.point.subtract(start).length();

            if (
                distance > 1e-4 &&
                distance <= movementDistance &&
                distance < nearestDistance
            ) {
                enemy.color.a -= 1;
                enemy.health -= 100;
                nearestDistance = distance;
                nearestHit = { ...hit, isEnemy: true };
            }
            if(enemy.health == 0){
                EneminesEliminated.set(enemy.id,enemy);
            }
            
        }

        for (const rect of Objects) {
        
            const hit = rayRecHit(start, this.direction, rect);

            if (!hit || !hit.normal)
                continue;

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
            this.pos = start.add(
                this.direction.scale(movementDistance)
            );
            return;
        }

        // Move the bullet to the collision point.
        this.pos = nearestHit.point;

        if (nearestHit.isEnemy) {
            this.lifeTimeOver = true;
            this.destroy();
            return;
        }

        // If the bullet cannot bounce anymore, destroy it.
        if (this.bouncesHappened >= this.bulletBounceThreshold) {
            this.lifeTimeOver = true;
            this.destroy();
            return;
        }

        // Reflect the direction using the surface normal.
        this.direction = this.direction.subtract(
            nearestHit.normal.scale(
                2 * this.direction.dot(nearestHit.normal)
            )
        ).normalize();

        this.bouncesHappened++;


        // Move slightly away from the wall to prevent
        // immediately detecting the same collision again.
        this.pos = this.pos.add(
            nearestHit.normal.scale(0.001)
        );

        
        
    }

    render() {
        // CHANGED: bullet size reduced to fit the tile-unit scale
        // (was 0.5, i.e. half a tile).
        LJS.drawRect(
            this.pos,
            LJS.vec2(0.3, 0.3),
            LJS.WHITE
        );
    }
}   