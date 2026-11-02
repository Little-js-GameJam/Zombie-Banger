import * as LJS from "littlejsengine";

export let Sprites = {};

export function initSprites() {
  Sprites = {
    // Bullet
    bullet: LJS.tile(0, 16, 6),

    // Player animation
    player: {
      idle: Array.from({ length: 20 }, (_, i) =>
        LJS.tile(i, LJS.vec2(313, 207), 7),
      ),
    },

    // Enemy animation
    enemy: {
      idle: Array.from({ length: 17 }, (_, i) =>
        LJS.tile(i, LJS.vec2(241, 222), 8),
      ),
    },
  };
}
