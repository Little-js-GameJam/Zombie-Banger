import * as LJS from "littlejsengine";

export let Sprites = {};

export function initSprites() {
  Sprites = {
    bullet: LJS.tile(6, 16, 0),
  };
}
