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
