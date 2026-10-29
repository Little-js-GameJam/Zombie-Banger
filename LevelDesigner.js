import * as LJS from 'littlejsengine'
import { Objects,addObject } from './Objects.js';
import { Rectangle } from './primitives.js';



let width;
let height;

export class LevelDesigner extends LJS.EngineObject {

    minX=0;
    maxX=0;
    minY =0;
    maxY=0;
    

    constructor({ minX, maxX, minY, maxY }){
        super();
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;

        const size = LJS.getCameraSize();
        width = size.x;
        height = size.y;

        const WHITE_COPY = LJS.WHITE.copy();
        // for now we will spawn obstacles around of size 10 from the edge the screen
        addObject("_Obstacle",new Rectangle(LJS.vec2(this.minX,0),LJS.vec2(1,height)),WHITE_COPY);
        addObject("_Obstacle",new Rectangle(LJS.vec2(this.maxX,0),LJS.vec2(1,height)),WHITE_COPY);
        addObject("_Obstacle",new Rectangle(LJS.vec2(0,this.minY),LJS.vec2(width,1)),WHITE_COPY);
        addObject("_Obstacle",new Rectangle(LJS.vec2(0,this.maxY),LJS.vec2(width,1)),WHITE_COPY);
        addObject("_Obstacle",new Rectangle(LJS.vec2(20,20),LJS.vec2(5,5)),WHITE_COPY);
        
    }

    update(){
        
    }

    render(){
        Objects.forEach(element => {
            LJS.drawRect(element.pos,element.size,element.color);
        });

    }

}