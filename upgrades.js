import { Upgrade } from "./Upgrade.js";
import { Sprites } from "./Sprites.js";
import { SplitOnDestroyEffect } from "./SplitOnDestroy.js";
import { SplitOnHitEffect } from "./SplitOnHit.js";

// Each upgrade receives the player (via setTarget) and edits player.stats.

// 1) Changes a bullet stat.
export class ExtraBounceUpgrade extends Upgrade {
  constructor(pos) {
    super(pos, {
      name: "Extra Bounce",
      description: "+1 wall bounce",
      tileInfo: Sprites.upgradeBounce, // replace with your own sprite
    });
  }

  apply(player) {
    player.stats.bulletStats.bounceThreshold += 1;
  }
}

// 2) Adds an effect to every future bullet.
export class SplitOnDestroyUpgrade extends Upgrade {
  constructor(pos) {
    super(pos, {
      name: "Split Shot",
      description: "Bullets split on destroy",
      tileInfo: Sprites.upgradeSplit,
    });
  }

  static weight = 0.5; // rarer than the others

  // Don't offer it twice.
  static isAvailable(player) {
    return !player.stats.bulletStats.effects.some(
      (effect) => effect instanceof SplitOnDestroyEffect,
    );
  }

  apply(player) {
    player.stats.bulletStats.effects.push(new SplitOnDestroyEffect(25));
  }
}
export class SplitOnHitUpgrade extends Upgrade {
  constructor(pos) {
    super(pos, {
      name: "Split Shot",
      description: "Bullets split on hit",
      tileInfo: Sprites.upgradeSplit,
    });
  }

  static weight = 0.5; // rarer than the others

  // Don't offer it twice.
  static isAvailable(player) {
    return !player.stats.bulletStats.effects.some(
      (effect) => effect instanceof SplitOnHitEffect,
    );
  }

  apply(player) {
    player.stats.bulletStats.effects.push(new SplitOnHitEffect(25));
  }
}

// 3) Changes a player stat.
export class FasterFireUpgrade extends Upgrade {
  constructor(pos) {
    super(pos, {
      name: "Rapid Fire",
      description: "-20% fire cooldown",
      tileInfo: Sprites.upgradeFireRate,
    });
  }

  apply(player) {
    player.stats.fireCooldown *= 0.8;
  }
}

export class ExtraPiercingUpgrade extends Upgrade {
  constructor(pos) {
    super(pos, {
      name: "Extra Piercing",
      description: "+1 pierce",
      tileInfo: Sprites.upgradePierce, // replace with your own sprite
    });
  }

  apply(player) {
    player.stats.bulletStats.bulletPierceThreshold += 1;
  }
}
