import * as LJS from 'littlejsengine';
import { Enemies, Objects,EneminesEliminated } from './Objects.js';
import { rayRecHit } from './player.js'; 

export class BulletClass extends LJS.EngineObject {

    // Direction in which the bullet currently travels.
    direction = LJS.vec2(0, 0);

    // Bullet configuration.
    doesPierce = false;
    bulletBounceThreshold = 2;
    bouncesHappened = 0;
    bulletVelocity = 400; // Units per second

    lifeTimeOver = false;

    constructor(startPos, targetPos) {
        super(startPos);

        // Calculate the direction from player to mouse.
        this.direction = targetPos
            .subtract(startPos)
            .normalize();
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

        for (const enemy of Enemies.values()) {
            const hit = rayRecHit(start, this.direction, enemy);
        
            if (!hit || !hit.normal)
                continue;
            
            const distance = hit.point.subtract(start).length();

            if (
                distance > 1e-4 &&
                distance <= movementDistance &&
                distance < nearestDistance
            ) {
                enemy.color.a -= 0.2;
                enemy.health -= 20;
                nearestDistance = distance;
                nearestHit = { ...hit, isEnemy: true };
            }

            if(enemy.health == 0){
                EneminesEliminated.set(enemy.id,enemy);
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
        // Draw the bullet at its actual position.
        LJS.drawRect(
            this.pos,
            LJS.vec2(2, 2),
            LJS.WHITE
        );
    }
}