
import * as LJS from 'littlejsengine';
import { PlayerClass,PlayerHealth,IncrBounces,DecrBounces,setPlayerHealth} from './player.js';
import { LevelDesigner,ResetWaveVals } from './LevelDesigner.js';
import { hexToColor } from './primitives.js';
import { Objects,Enemies} from './Objects.js';

export let WAVE_COUNT = 1;
export let IsGameEnded = false;  
export let IsGameStarted = false;
export let GameInitialized = false;


export function setGameEnd(){
    IsGameEnded = true;
}

let isGameRuleOpened = false;

let player;
let levelDesigner;
let minX,maxX,minY,maxY;

let restartButtonHovered = false;
let mousePressed = false;

export function SetGameInitialized(val){
    GameInitialized = val;
}

function getUIScale() {
    const screen = LJS.mainCanvasSize;

    return Math.min(
        screen.x / 1280,
        screen.y / 720
    );
}

export async function startGame() {
    LJS.engineObjectsDestroy();

    ResetWaveCount();
    ResetWaveVals();
    SetGameInitialized(false);

    const size = LJS.getCameraSize();
    const pos = LJS.cameraPos;

    minX = pos.x - size.x / 2;
    maxX = pos.x + size.x / 2;
    minY = pos.y - size.y / 2;
    maxY = pos.y + size.y / 2;

    Objects.length = 0;
    Enemies.clear();


    setPlayerHealth(100);
    IsGameEnded = false;

    levelDesigner = new LevelDesigner({minX,maxX,minY,maxY});
    await levelDesigner.ready;
    player = new  PlayerClass(LJS.vec2(0,0),2);
    GameInitialized= true;
}

//Currently give player some health after each wave
export function IncrWaveCount(){
    WAVE_COUNT++;
    setPlayerHealth(PlayerHealth + 30);
}

export function ResetWaveCount(){
    WAVE_COUNT = 1;
    console.log(WAVE_COUNT);
}

function DisplayGameRules(){
    // isGameRuleOpened = false;
    const scale = getUIScale();
    const screen = LJS.mainCanvasSize;

    const GameRuleDisplaySize= LJS.vec2(400, 600).scale(scale);
    const GameRuleDisplayPos = screen.scale(0.5);
    //Placeholder for now change this with actual rules
    const rules = [
        "1. Survive as long as possible.",
        "2. Avoid contact with zombies.",
        "3. Eliminate enemies to earn points.",
        "4. Don't let your health reach zero.",
        "5. Try to achieve the highest score."
    ];

    LJS.drawRect(GameRuleDisplayPos,GameRuleDisplaySize,LJS.BLACK,0,false,true);
    rules.forEach((rule, i) => {

        LJS.drawText(
            rule,
            LJS.vec2(0, 15 - i * 6 - 3),
            1,
            LJS.WHITE,
            0,
            LJS.BLACK
        );
    });

}



let gameEndtexture;

let backgroundImage;
let menuImage;
let startButtonImage;
let rulesButtonImage;

let restartButtonImage;

function loadMenuImages() {

    backgroundImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(1099, 661), 0); 
    menuImage  = LJS.tile(LJS.vec2(0, 0), LJS.vec2(256, 256), 1); 
    startButtonImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(256, 256),  2); 
    rulesButtonImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(256, 256),  3); 
    restartButtonImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(256, 256),  4); 
}

async function loadMenuSprites (){
    try{
        gameEndtexture = LJS.loadSprite(
            '/assets/Game_end.png',
            LJS.vec2(64, 64)
        );

        await LJS.spritesReady();
    }catch (error) {
         console.error('Error loading Texture:', error);
    }

    console.log("TEXTURE LOADED");
}


function gameInit() {
    if(IsGameStarted){
        console.log("HERE 2");
        startGame();
    }
    
    loadMenuSprites();
    loadMenuImages();
    
}


function isButtonClicked(pos, size) {
    const mouse = LJS.mousePosScreen;
    const hovering =
        mouse.x >= pos.x - size.x / 2 &&
        mouse.x <= pos.x + size.x / 2 &&
        mouse.y >= pos.y - size.y / 2 &&
        mouse.y <= pos.y + size.y / 2;

        
    restartButtonHovered = hovering;

    return hovering && mousePressed;
}

function gameUpdate() {
    mousePressed = false;
    if(LJS.mouseWasPressed(0)) mousePressed = true;
    //Let player choose the number of Bounces
    if(LJS.keyWasPressed('NumpadAdd') ){
        IncrBounces();
    }
    else if(LJS.keyWasPressed('NumpadSubtract')){
       DecrBounces();
    }
    
   
}



function gameUpdatePost() {
    if(PlayerHealth <=0 && !IsGameEnded){
        IsGameEnded = true;
    }
}
function gameRender() {}


function gameRenderPost() {
    const scale = getUIScale();
    const screen = LJS.mainCanvasSize;
    if(!IsGameStarted){
        LJS.drawTile(
            LJS.vec2(0,0),       
            screen.scale(0.035),
            backgroundImage
        );


        const MenubackgroundSize= LJS.vec2(16, 16).scale(scale);
        const MenubackgroundPos = LJS.vec2(0,0);
        LJS.drawTile(
            MenubackgroundPos,       
            MenubackgroundSize,
            menuImage
        );


        const StartbuttonSize = LJS.vec2(256, 256).scale(scale);
        const StartbuttonPos = LJS.vec2(
            screen.x * 0.5,
            screen.y * 0.4           
        );

        LJS.drawTile(
            StartbuttonPos,
            StartbuttonSize,
            startButtonImage,
            LJS.WHITE,  
            0,          
            false,      
            undefined,  
            false,      
            true        
        );

        if(isButtonClicked(StartbuttonPos,StartbuttonSize) ){
            IsGameStarted = true;
            gameInit();
        }

        const GameRulebuttonSize = LJS.vec2(256, 256).scale(scale);
        const GameRulebuttonPos = LJS.vec2(
            screen.x * 0.5,
            screen.y * 0.6           
        );

        LJS.drawTile(
            GameRulebuttonPos,       
            GameRulebuttonSize,   
            rulesButtonImage,
            LJS.WHITE,  
            0,          
            false,      
            undefined,  
            false,      
            true            
        );

        if(isButtonClicked(GameRulebuttonPos,GameRulebuttonSize) ){
            isGameRuleOpened = true;
        }


        if(isGameRuleOpened){
            DisplayGameRules();
        }

        return;
    }


    if(IsGameEnded){

        const GameEndPopUpSize = LJS.vec2(4,4).scale(scale);
        const GameEndPopUpPos = LJS.vec2(0,0);
        LJS.drawRect(LJS.vec2(0,0),LJS.mainCanvasSize,hexToColor("#2f2e2dbf"));


        LJS.drawTile(
            GameEndPopUpPos,
            GameEndPopUpSize,
            gameEndtexture,
        );

        const restartButtonSize = LJS.vec2(128, 128).scale(scale);
        const restartButtonPos = screen.scale(0.5).add(LJS.vec2(0,400));

        LJS.drawTile(
            restartButtonPos,
            restartButtonSize,
            restartButtonImage,
            LJS.WHITE,  
            0,          
            false,      
            undefined,  
            false,      
            true        
        );
        
        if(isButtonClicked(restartButtonPos,restartButtonSize)){
           startGame();
        }
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
    [   
        '/assets/lvl1_background_2.png',
        '/assets/Pixelated_menu_background.png', 
        '/assets/Pixelated_start_button.png',     
        '/assets/Pixelated_rules_button.png',      
        '/assets/Pixelated_restart_button.png'      
    ]
);
