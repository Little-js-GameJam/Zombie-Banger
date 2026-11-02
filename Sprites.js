import * as LJS from "littlejsengine";

export let Sprites = {};

export function initSprites() {
  Sprites = {
    bullet: LJS.tile(0, 16, 0),

    // Add more sprites here when needed.
    // upgradeBounce: LJS.tile(1, 16, 0),
    // upgradeSplit: LJS.tile(2, 16, 0),
  };
}
