export class BulletStats {
  // Basic bullet properties
  velocity = 10;
  damage = 20;

  // Collision properties
  bounceThreshold = 5;
  bulletPierceThreshold = 5;

  // Number of bullets fired at once
  fireCount = 1;

  // Angle between bullets in a spread
  spreadAngle = 15;

  // Special behaviors applied to bullets
  effects = [];
}

export class PlayerStats {
  // Player's firing configuration
  fireCooldown = 0.5;

  guidelineDistance = 50;

  // Bullet configuration
  bulletStats = new BulletStats();
}
