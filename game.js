
import * as LJS from 'littlejsengine';
import { PlayerClass } from './player.js';
import { LevelDesigner } from './LevelDesigner.js';
import { Enemies,addObject,EneminesEliminated } from './Objects.js';
import { Enemy } from './Enemy.js';

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

    player = new  PlayerClass(LJS.vec2(0,0),10); // Starting pos
    levelDesigner = new LevelDesigner({minX,maxX,minY,maxY});

}


let temp_enemies = new Map();
function gameUpdate() {
    mouse_pos = LJS.mousePos;

    for (const id of EneminesEliminated.keys()) {
        Enemies.delete(id);
    }
    EneminesEliminated.clear();
    // TEMP add a way to add enemies for testing purpose
    if(LJS.keyWasPressed("NumpadAdd")){
        const enemy = new Enemy(Enemies.size);
        addObject("_Enemy",enemy,LJS.RED.copy());
    }


}

function gameUpdatePost() {}

function gameRender() {

    for(const enemy of Enemies.values()){
        LJS.drawCircle(enemy.pos,enemy.size.x,enemy.color);
    }
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
