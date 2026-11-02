import { BulletEffect } from "./BulletEffect.js";
import { BulletClass } from "./Bullet.js";
import { Enemies, Objects } from "./Objects.js";
import { rayRecHit } from "./Player.js";

export class SplitOnDestroyEffect extends BulletEffect {
  constructor(splitAngle = 25) {
    super();

    this.splitAngle = splitAngle;
  }

  // Find the surface the bullet just hit by casting a short ray
  // from slightly behind the bullet along its direction of travel.
  findHitSurface(bullet) {
    const stepBack = 0.05;
    const origin = bullet.pos.subtract(bullet.direction.scale(stepBack));

    let nearest = null;
    let nearestDistance = Infinity;

    for (const target of [...Objects, ...Enemies.values()]) {
      const hit = rayRecHit(origin, bullet.direction, target);

      if (!hit || !hit.normal) continue;

      const distance = hit.point.subtract(origin).length();

      // Only accept the surface we just touched, not something further away.
      if (distance <= stepBack * 2 && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = hit;
      }
    }

    return nearest;
  }

  onBulletDestroy(bullet) {
    let baseDirection = bullet.direction;
    let spawnPos = bullet.pos;

    const hit = this.findHitSurface(bullet);

    if (hit) {
      // Reflect off the surface so the children travel away from it.
      baseDirection = bullet.direction
        .subtract(hit.normal.scale(2 * bullet.direction.dot(hit.normal)))
        .normalize();

      // Start slightly off the surface so they don't tunnel through it.
      spawnPos = bullet.pos.add(hit.normal.scale(0.01));
    }

    const angles = [-this.splitAngle, this.splitAngle];

    for (const angle of angles) {
      const newDirection = baseDirection.rotate((angle * Math.PI) / 180);

      const target = spawnPos.add(newDirection);

      const newBullet = new BulletClass(spawnPos, target, bullet.player);

      // Inherit numerical properties.
      newBullet.bulletVelocity = bullet.bulletVelocity;

      newBullet.damage = bullet.damage;

      newBullet.bulletBounceThreshold = bullet.bulletBounceThreshold;

      newBullet.doesPierce = bullet.doesPierce;

      // Prevent infinite splitting.
      // These bullets inherit other effects,
      // but not the splitting effect itself.
      newBullet.effects = bullet.effects.filter((effect) => effect !== this);

      bullet.spawnBullet(newBullet);
    }
  }
}
