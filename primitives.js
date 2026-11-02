import * as LJS from 'littlejsengine';

export const COLOR_BG     = new LJS.Color(0.137, 0.153, 0.227); // #23273A - Dark Midnight Navy
export const COLOR_SLATE  = new LJS.Color(0.431, 0.447, 0.510); // #6E7282 - Steel / Slate Grey
export const COLOR_ORANGE = new LJS.Color(0.933, 0.290, 0.067); // #EE4A11 - Burnt Orange Accent
export const COLOR_TEXT   = new LJS.Color(0.886, 0.902, 0.933); // #E2E6EE - Off-white / Silver


export class Rectangle{
    type = "_Obstacle";
    color = LJS.WHITE.copy();
    pos;
    size;
    constructor(pos,size){
        this.pos = pos;
        this.size = size;
    }
}

// Helper Functions
export function hexToColor(hex) {
    const value = hex.replace('#', '');

    return new LJS.Color(
        parseInt(value.substring(0, 2), 16) / 255,
        parseInt(value.substring(2, 4), 16) / 255,
        parseInt(value.substring(4, 6), 16) / 255,
        value.length === 8
            ? parseInt(value.substring(6, 8), 16) / 255
            : 1
    );
}



