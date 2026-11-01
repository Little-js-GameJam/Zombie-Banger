
import * as LJS from 'littlejsengine';
import { PlayerClass,PlayerHealth,IncrBounces,DecrBounces} from './player.js';
import { LevelDesigner } from './LevelDesigner.js';
export let WAVE_COUNT = 1;

let player;
let levelDesigner;
let minX,maxX,minY,maxY;

export function IncrWaveCount(){
    WAVE_COUNT++;
}



function gameInit() {

    const size = LJS.getCameraSize();
    const pos = LJS.cameraPos;

    minX = pos.x - size.x / 2;
    maxX = pos.x + size.x / 2;
    minY = pos.y - size.y / 2;
    maxY = pos.y + size.y / 2;

    player = new  PlayerClass(LJS.vec2(0,0),2); // Starting pos
    levelDesigner = new LevelDesigner({minX,maxX,minY,maxY});


    
    loadText();

}


let IsGameEnded = false;    

function gameUpdate() {
    if(IsGameEnded){ LJS.setPaused(true);}

    //Let player choose the number of Bounces
    if(LJS.keyWasPressed('NumpadAdd') ){
        IncrBounces();
    }
    else if(LJS.keyWasPressed('NumpadSubtract')){
       DecrBounces();
    }
    
}
let gameEndtexture;
async function loadText (){
    try{
        gameEndtexture = LJS.loadSprite(
            '/assets/Game_end.png',
            LJS.vec2(32, 32)
        );

        await LJS.spritesReady();
    }catch (error) {
         console.error('Error loading Texture:', error);
    }

    console.log("Texture Loaded");
}

function gameUpdatePost() {
    if(PlayerHealth <=0 && !IsGameEnded){
        IsGameEnded = true;
        LJS.setPaused(true);
    }

}
function gameRender() {


}
function gameRenderPost() {


    if(IsGameEnded){

        LJS.drawTile(
            LJS.vec2(0, 0),
            LJS.vec2(8, 8),
            gameEndtexture
        );


        return;        
        

    }
    
    LJS.drawTextScreen(
        `Health: ${PlayerHealth}`,
        LJS.vec2(LJS.mainCanvasSize.x - 150, 100), // Change this to upper right corner
        24
    );

}


LJS.engineInit(
    gameInit,
    gameUpdate,
    gameUpdatePost,
    gameRender,
    gameRenderPost,
);
