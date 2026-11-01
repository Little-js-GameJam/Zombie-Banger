import * as LJS from 'littlejsengine';
import { Objects } from './Objects.js';
import { rayRecHit } from './player.js'; 

// CHANGED: set to true to log every bounce in the browser console.
const DEBUG_BULLETS = true;

export class BulletClass extends LJS.EngineObject {

    // Direction in which the bullet currently travels.
    direction = LJS.vec2(0, 0);

    // Bullet configuration.
    doesPierce = false;
    bulletBounceThreshold = 2;
    bouncesHappened = 0;

    // CHANGED: was 400. The level is now in tile units (map is 25 x 15 units),
    // so 400 units/s crossed the whole map in ~4 frames and used up all
    // bounces almost instantly. 30 units/s is about 1 second per crossing.
    bulletVelocity = 30; // Units (tiles) per second

    lifeTimeOver = false;

    constructor(startPos, targetPos) {
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
    }

    update() {
        if (this.lifeTimeOver)
            return;

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

        // No collision: move normally.
        if (!nearestHit) {
            this.pos = start.add(
                this.direction.scale(movementDistance)
            );
            return;
        }

        // Move the bullet to the collision point.
        this.pos = nearestHit.point;

        // CHANGED: log each wall hit (bounce number, position, wall normal).
        if (DEBUG_BULLETS)
            console.log(
                'bullet HIT #' + (this.bouncesHappened + 1),
                'at', this.pos.x.toFixed(2), this.pos.y.toFixed(2),
                'normal', nearestHit.normal.x, nearestHit.normal.y
            );

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