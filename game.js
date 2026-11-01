
import * as LJS from 'littlejsengine';
import { PlayerClass } from './player.js';
import { LevelDesigner } from './LevelDesigner.js';
import { Enemies,addObject,EneminesEliminated } from './Objects.js';

let player;
let levelDesigner;
let minX,maxX,minY,maxY;
let mouse_pos = LJS.vec2(0,0);


function gameInit() {

    const size = LJS.getCameraSize();
    const pos = LJS.cameraPos;

    minX = pos.x - size.x / 2;
    maxX = pos.x + size.x / 2;
    minY = pos.y - size.y / 2;
    maxY = pos.y + size.y / 2;

    player = new  PlayerClass(LJS.vec2(0,0),2); // Starting pos
    levelDesigner = new LevelDesigner({minX,maxX,minY,maxY});

}



function gameUpdate() {

}

function gameUpdatePost() {}

function gameRender() {


}

function gameRenderPost() {

}

LJS.engineInit(
    gameInit,
    gameUpdate,
    gameUpdatePost,
    gameRender,
    gameRenderPost
);
