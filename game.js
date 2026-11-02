import * as LJS from "littlejsengine";
import { PlayerClass } from "./player.js";
import { LevelDesigner, ResetWaveVals } from "./LevelDesigner.js";
import {
  COLOR_TEXT,
  hexToColor,
  COLOR_BG,
  COLOR_ORANGE,
  COLOR_SLATE,
} from "./primitives.js";
import { Objects, Enemies, EneminesEliminated } from "./Objects.js";
import { initSprites } from "./Sprites.js";
export let WAVE_COUNT = 1;
export let IsGameEnded = false;
export let IsGameStarted = false;
export let GameInitialized = false;

let totalZombiesKilledCurrent = 0;
let highestZombiesKilled = 0;

export function zombieCountIncrease() {
  totalZombiesKilledCurrent++;
  highestZombiesKilled = Math.max(highestZombiesKilled, totalZombiesKilledCurrent);
}

// in startGame(), with the other resets:
totalZombiesKilledCurrent = 0;
EneminesEliminated.clear();   // import it from Objects.js

// music shit !
const bgMusic = new Audio("/assets/sounds/bgmusic.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

// Every second, if the music isn't playing, start it again
setInterval(() => {
  if (bgMusic.paused) bgMusic.play().catch(() => {});
}, 1000);

export function setGameEnd() {
  IsGameEnded = true;
}

let isGameRuleOpened = false;

let player;
let levelDesigner;
let minX, maxX, minY, maxY;

let restartButtonHovered = false;
let mousePressed = false;

export function SetGameInitialized(val) {
  GameInitialized = val;
}

function getUIScale() {
  const screen = LJS.mainCanvasSize;

  return Math.min(screen.x / 1280, screen.y / 720);
}
let isUIInitialized = false;
export async function startGame() {
  LJS.engineObjectsDestroy();
  if(!isUIInitialized){
    const uiSystem = new LJS.UISystemPlugin();
    isUIInitialized =true;
  }
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

  IsGameEnded = false;
  player = new PlayerClass(LJS.vec2(0, 0), 2);
  levelDesigner = new LevelDesigner({ minX, maxX, minY, maxY, player });
  await levelDesigner.ready;

  GameInitialized = true;
}

//Currently give player some health after each wave
export function IncrWaveCount() {
  WAVE_COUNT++;
}

export function ResetWaveCount() {
  WAVE_COUNT = 1;
  console.log(WAVE_COUNT);
}

function DisplayGameRules() {
  // isGameRuleOpened = false;
  const scale = getUIScale();
  const screen = LJS.mainCanvasSize;

  const GameRuleDisplaySize = LJS.vec2(400, 600).scale(scale);
  const GameRuleDisplayPos = screen.scale(0.5);
  const ruleGroups = [
    ["Hello there fellow survivor!!"],
    ["To survive further, follow these rules:"],
    ["1. Don't let Bullets run out!!!"],
    ["2. Eliminate enemies to earn Bullets."],
    ["3. Survive up to 5 waves.", "   Each wave doubles the zombies!"],
    ["4. Get power-ups after each wave."],
  ];

  LJS.drawTile(
    GameRuleDisplayPos,
    GameRuleDisplaySize,
    menuImage,
    LJS.WHITE,
    0,
    false,
    undefined,
    false,
    true,
  );

  const startY = GameRuleDisplayPos.y - GameRuleDisplaySize.y / 2 + 50 * scale;
  const fontSize = Math.max(14, Math.floor(18 * scale));
  const lineHeight = 28 * scale;
  const groupGap = 12 * scale;

  let currentY = startY;

  // 7. Render each group dynamically
  ruleGroups.forEach((group) => {
    group.forEach((line) => {
      LJS.drawTextScreen(
        line,
        LJS.vec2(GameRuleDisplayPos.x, currentY),
        fontSize,
        COLOR_TEXT,
        1,
        COLOR_SLATE,
        "center",
      );
      currentY += lineHeight;
    });
    currentY += groupGap; // Add a bit of space after each full rule group
  });

  const BackButtonDisplaySize = LJS.vec2(60, 60).scale(scale);
  const BackButtonDisplayPos = LJS.vec2(
    GameRuleDisplayPos.x + GameRuleDisplaySize.x / 2 - 100 * scale,
    GameRuleDisplayPos.y + GameRuleDisplaySize.y / 2 - 100 * scale,
  );

  LJS.drawTile(
    BackButtonDisplayPos,
    BackButtonDisplaySize.scale(1.25),
    buttonShadowImage,
    LJS.WHITE,
    0,
    false,
    undefined,
    false,
    true,
  );

  LJS.drawTile(
    BackButtonDisplayPos,
    BackButtonDisplaySize,
    backButtonImage,
    LJS.WHITE,
    0,
    false,
    undefined,
    false,
    true,
  );
  // LJS.drawRect(BackButtonDisplayPos,BackButtonDisplaySize,LJS.WHITE,0,false,true);
  if (isButtonClicked(BackButtonDisplayPos, BackButtonDisplaySize)) {
    isGameRuleOpened = false;
  }
}

let gameEndtexture;

let backgroundImage;
let buttonImage;
let backButtonImage;
let menuImage;
let logoImage;
let buttonShadowImage;
let leaderBoardImage;
function loadMenuImages() {
  backgroundImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(1099, 661), 0);
  buttonImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(200, 120), 1);
  backButtonImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(120, 120), 2);
  menuImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(200, 400), 3);
  logoImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(1024, 1024), 4);
  buttonShadowImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(200, 120), 5);
  leaderBoardImage = LJS.tile(LJS.vec2(0, 0), LJS.vec2(400, 400), 9);
  

  console.log("IMAGES LOADED");
}

async function loadMenuSprites() {
  try {
    gameEndtexture = LJS.loadSprite("/assets/Game_end.png", LJS.vec2(64, 64));

    await LJS.spritesReady();
  } catch (error) {
    console.error("Error loading Sprite:", error);
  }

  console.log("SPRITE LOADED");
}

function gameInit() {
  if (IsGameStarted) {
    console.log("HERE 2");
    startGame();
  }
  initSprites();

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
  if (LJS.mouseWasPressed(0)) mousePressed = true;
  if(!IsGameStarted) return;

  if(player.stats.availableBullets <= 0){
    IsGameEnded = true;
  }

}

function gameUpdatePost() {
  // if(PlayerHealth <=0 && !IsGameEnded){
  //     IsGameEnded = true;
  // }
  //Change this to check if number of bullets run out
}
function gameRender() {

  if(!IsGameStarted) return;

  const scale = getUIScale();
  const screen = LJS.mainCanvasSize;

  LJS.drawTextScreen(
    `Bullets: ${player.stats.availableBullets}`,
    LJS.vec2(screen.x * 0.95,screen.y * 0.05),
    18,
    LJS.WHITE,
    1,
    LJS.WHITE,
    'center'
  )

}

function gameRenderPost() {
  const scale = getUIScale();
  const screen = LJS.mainCanvasSize;
  if (!IsGameStarted) {
    LJS.drawTile(LJS.vec2(0, 0), screen.scale(0.035), backgroundImage);

    const LogoSize = LJS.vec2(256, 256).scale(scale);
    const LogoPos = LJS.vec2(screen.x * 0.5, screen.y * 0.1);

    LJS.drawTile(
      LogoPos,
      LogoSize,
      logoImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    const MenubackgroundSize = LJS.vec2(300, 400).scale(scale);
    const MenubackgroundPos = screen.scale(0.5);
    LJS.drawTile(
      MenubackgroundPos,
      MenubackgroundSize,
      menuImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    const StartbuttonSize = LJS.vec2(200, 120).scale(scale);
    const StartbuttonPos = LJS.vec2(screen.x * 0.5, screen.y * 0.4);

    LJS.drawTile(
      StartbuttonPos,
      StartbuttonSize.scale(1.15),
      buttonShadowImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    LJS.drawTile(
      StartbuttonPos,
      StartbuttonSize,
      buttonImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    LJS.drawTextScreen(
      "START",
      StartbuttonPos,
      48,
      COLOR_TEXT,
      5,
      COLOR_ORANGE,
      "center",
    );

    if (isButtonClicked(StartbuttonPos, StartbuttonSize) && !isGameRuleOpened) {
      IsGameStarted = true;
      gameInit();
    }

    const GameRulebuttonSize = LJS.vec2(200, 120).scale(scale);
    const GameRulebuttonPos = LJS.vec2(screen.x * 0.5, screen.y * 0.6);

    LJS.drawTile(
      GameRulebuttonPos,
      GameRulebuttonSize.scale(1.15),
      buttonShadowImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    LJS.drawTile(
      GameRulebuttonPos,
      GameRulebuttonSize,
      buttonImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    LJS.drawTextScreen(
      "GAME \n RULE",
      GameRulebuttonPos,
      48,
      COLOR_TEXT,
      5,
      COLOR_ORANGE,
      "center",
    );

    if (isButtonClicked(GameRulebuttonPos, GameRulebuttonSize)) {
      isGameRuleOpened = true;
    }

    if (isGameRuleOpened) {
      DisplayGameRules();
    }

    return;
  }

  if (IsGameEnded) {
    const GameEndPopUpSize = LJS.vec2(400, 400).scale(scale);
    const GameEndPopUpPos = LJS.vec2(screen.x * 0.5, screen.y * 0.5);
    LJS.drawRect(LJS.vec2(0, 0), LJS.mainCanvasSize, hexToColor("#2f2e2dbf"));

    LJS.drawTile(
      GameEndPopUpPos, 
      GameEndPopUpSize, 
      leaderBoardImage,LJS.WHITE,0,false,undefined,false,true
    );

      const lines = [
        [`Highest Number of zombies killed: ${highestZombiesKilled}`],
        [`Number of Bullets fired: ${player.stats.totalFiredBullets}`]
      ]

    const startY = GameEndPopUpPos.y - GameEndPopUpSize.y / 2 + 50 * scale;
    const fontSize = Math.max(14, Math.floor(18 * scale));
    const lineHeight = 28 * scale;
    const groupGap = 12 * scale;

    let currentY = startY;
    lines.forEach((group) => {
    group.forEach((line) => {
      LJS.drawTextScreen(
        line,
        LJS.vec2(screen.x*0.5, currentY),
        fontSize,
        COLOR_TEXT,
        1,
        COLOR_SLATE,
        "center",
      );
      currentY += lineHeight;
    });
    currentY += groupGap; // Add a bit of space after each full rule group
  });

    const restartButtonSize = LJS.vec2(200, 120).scale(scale);
    const restartButtonPos = screen
      .scale(0.5)
      .add(LJS.vec2(0, 250).scale(scale));

    LJS.drawTile(
      restartButtonPos,
      restartButtonSize,
      buttonImage,
      LJS.WHITE,
      0,
      false,
      undefined,
      false,
      true,
    );

    LJS.drawTextScreen(
      "RESTART",
      restartButtonPos,
      32,
      COLOR_TEXT,
      5,
      COLOR_ORANGE,
      "center",
    );

    if (isButtonClicked(restartButtonPos, restartButtonSize)) {
      startGame();
    }
    return;
  }
}

document.fonts.ready.then(() => {
  LJS.engineInit(
    gameInit,
    gameUpdate,
    gameUpdatePost,
    gameRender,
    gameRenderPost,
    [
      "/assets/lvl1_background_2.png",
      "/assets/for_menu/button_template.png",
      "/assets/for_menu/back_button.png",
      "/assets/for_menu/main_menu.png",
      "/assets/Logo.png",
      "/assets/for_menu/button_template_shadow.png",
      "/assets/bullet.png",
      "/assets/playerSprite/playerSprite.png",
      "/assets/sprites/spritesheet.png",
      "/assets/Leaderboard.png"
    ],
  );
});
