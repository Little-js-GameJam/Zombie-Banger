import { BulletEffect } from "./BulletEffect.js";
import { BulletClass } from "./Bullet.js";

export class SplitOnHitEffect extends BulletEffect {
  constructor(splitAngle = 25) {
    super();

    this.splitAngle = splitAngle;
  }

  onEnemyHit(bullet, enemy) {
    const angles = [-this.splitAngle, this.splitAngle];

    for (const angle of angles) {
      const newDirection = bullet.direction.rotate((angle * Math.PI) / 180);

      const target = bullet.pos.add(newDirection);

      const newBullet = new BulletClass(bullet.pos, target, bullet.player);

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
