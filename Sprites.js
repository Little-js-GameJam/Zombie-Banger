import * as LJS from "littlejsengine";

export let Sprites = {};

export function initSprites() {
  Sprites = {
    bullet: LJS.tile(0, 16, 6),
  };
}
