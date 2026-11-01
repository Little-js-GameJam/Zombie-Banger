import * as LJS from 'littlejsengine';



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



