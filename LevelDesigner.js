import * as LJS from 'littlejsengine';
import { Objects,Enemies,addObject,EneminesEliminated } from './Objects.js';
import { IncrWaveCount,WAVE_COUNT,setGameEnd} from './game.js';
import { Enemy } from './Enemy.js';

const MAP_URL = '/assets/level/level1/zbLevel1.tmj';
const TILESET_URL = '/assets/level/jawbreaker_tiles.png';


const ZOMBIE_IMAGE = '/assets/sprites/spritesheet.png';
const ZOMBIE_JSON = '/assets/sprites/zomsprites.json';
// Size of the whole zombie spritesheet image (from "meta.size" in the JSON).
// loadSprite is given this as the "frame" size so its grid check passes;
// the real frame rectangles come from the JSON.
const ZOMBIE_SHEET_SIZE = LJS.vec2(967, 1114);
// One zombie frame is 241 x 222 pixels
const ZOMBIE_FRAME_W = 241;
const ZOMBIE_FRAME_H = 222;

// CHANGED: on for now. Red boxes = exactly what the ray and bullets collide with.
const SHOW_COLLISION_DEBUG = false;


let IS_FIRST_WAVE_LOADED = false;
let IS_NEXT_WAVE_LOADED = false;

export function ResetWaveVals(){
    IS_FIRST_WAVE_LOADED = false;
    IS_NEXT_WAVE_LOADED = false;
}

// let WAVE_COUNT = 1;
// Invisible static collider (drawn only when debugging)
class Wall extends LJS.EngineObject {
    constructor(pos, size) {
        super(pos, size);
        this.mass = 0; // static, never pushed
        // CHANGED: was (false, true, false, true). LittleJS 1.28 asserts that
        // a solid object must also collide with solid objects, which threw an
        // error here and left Objects empty. The ray and bullet use their own
        // rectangle maths, so the walls don't need to be physically solid.
        // (collideSolidObjects, isSolid, collideTiles, collideRaycast)
        this.setCollision(false, false, false, true);
    }

    render() {
        if (SHOW_COLLISION_DEBUG)
            LJS.drawRect(this.pos, this.size, new LJS.Color(1, 0, 0, 0.4));
    }
}

export class LevelDesigner extends LJS.EngineObject {

    constructor({ minX, maxX, minY, maxY, fitCamera = true } = {}) {
        super();

        this.mapWidth = 0;
        this.mapHeight = 0;

        this.mapMinX = 0;
        this.mapMaxX = 0;
        this.mapMinY = 0;
        this.mapMaxY = 0;

        this.wallLayerData = null;
        this.zombieFrames = [];

        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.fitCamera = fitCamera;

        this.tileLayers = [];
        this.walls = [];

        this.ready = this.loadMap();
       
    }

    
    isSpawnBlocked(pos, size) {
        if (!this.wallLayerData) return true;

        const halfSize = size.scale(0.5);

        // 1. Check wall tiles
        const minX = Math.floor(pos.x - halfSize.x + this.mapWidth / 2);
        const maxX = Math.floor(pos.x + halfSize.x - 0.0001 + this.mapWidth / 2);

        const minY = Math.floor(this.mapHeight / 2 - (pos.y + halfSize.y));
        const maxY = Math.floor(this.mapHeight / 2 - (pos.y - halfSize.y) - 0.0001);

        for (let row = minY; row <= maxY; row++) {
            for (let col = minX; col <= maxX; col++) {

                if (
                    col < 0 || col >= this.mapWidth ||
                    row < 0 || row >= this.mapHeight
                ) return true;

                const gid = this.wallLayerData[row * this.mapWidth + col] & 0x1FFFFFFF;

                if (gid !== 0) return true;
            }
        }

        // 2. Check existing zombies
        for (const enemy of Enemies.values()) {
            const enemyHalf = enemy.size.scale(0.5);

            const overlapX =
                Math.abs(pos.x - enemy.pos.x) < halfSize.x + enemyHalf.x;

            const overlapY =
                Math.abs(pos.y - enemy.pos.y) < halfSize.y + enemyHalf.y;

            if (overlapX && overlapY)
                return true;
        }

        // 3. Check player
        const playerPos = LJS.vec2(0, 0);
        const minSpawnDistance = 5;

        const distance = pos.distance(playerPos);

        if (distance < minSpawnDistance)
            return true;
            

        return false;
    }

    getValidSpawnPosition(size) {
        const margin = 2;
        
        for (let i = 0; i < 100; i++) {
        
            const pos = LJS.vec2(
                LJS.rand(
                    this.mapMinX + margin,
                    this.mapMaxX - margin
                ),
                LJS.rand(
                    this.mapMinY + margin,
                    this.mapMaxY - margin
                )
            );
        
            if (!this.isSpawnBlocked(pos, size))
                return pos;
        }
    
        console.warn("Could not find a valid zombie spawn position");
        return null;
    }

    async loadMap() {
        try {
            const response = await fetch(MAP_URL);
            if (!response.ok)
                throw new Error(`Failed to load map: ${response.status}`);

            const map = await response.json();
            
            this.mapWidth = map.width;
            this.mapHeight = map.height;

            // 1 tile = 1 world unit, map centered on (0, 0)
            const firstGid = map.tilesets[0].firstgid;
            this.mapMinX = -map.width / 2;
            this.mapMaxX = map.width / 2;

            this.mapMinY = -map.height / 2;
            this.mapMaxY = map.height / 2;

            
            // CHANGED: build colliders first. They don't need the tileset, so
            // a tileset/drawing problem can no longer leave the level without
            // collisions, and walls exist from the first frame.
            const wallLayer = map.layers.find(l => l.name === 'walls');
            if (wallLayer) {
                this.wallLayerData = wallLayer.data;
                this.buildColliders(map, wallLayer);
            }
            // CHANGED: confirms the JSON walls became colliders in Objects
            // console.log('wall colliders from JSON:', this.walls.length,
                // '| Objects total:', Objects.length);

            // loadSprite returns a TileInfo that is filled in once loaded
            const tileset = LJS.loadSprite(
                TILESET_URL,
                LJS.vec2(map.tilewidth, map.tileheight)
            );

            // Zombie sheet: treat the whole image as one "frame" so loadSprite's
            // grid check passes. Real frame rectangles come from the JSON below.
            // (loadSprite must be called BEFORE awaiting spritesReady.)
            // Measure the real PNG so frame positions always match the picture,
            // even if the PNG was exported at a different size than the JSON says.
            const probe = new Image();
            probe.src = ZOMBIE_IMAGE;
            await probe.decode();
            const zombieSheet = LJS.loadSprite(
                ZOMBIE_IMAGE,
                LJS.vec2(probe.naturalWidth, probe.naturalHeight)
            );
            const atlasJson = await (await fetch(ZOMBIE_JSON)).json();
            const sx = probe.naturalWidth / atlasJson.meta.size.w;
            const sy = probe.naturalHeight / atlasJson.meta.size.h;

            
            await LJS.spritesReady();

            // Keep only the idle frames, sort them by the number in the
            // filename (the JSON lists them out of order), and turn each
            // into a TileInfo pointing at the zombie texture.
            // tweak these until the zombie sits fully in the frame (units are pixels of the PNG)
            const OFFSET_X = 150;
            const OFFSET_Y = 0;

            this.zombieFrames = atlasJson.frames
                .filter(f => f.filename.startsWith('skeleton-idle_'))
                .sort((a, b) => {
                    const getNumber = f =>
                        Number(f.filename.match(/_(\d+)$/)[1]);
                
                    return getNumber(a) - getNumber(b);
                })
                .map(f => new LJS.TileInfo(
                    LJS.vec2(f.frame.x * sx + OFFSET_X, f.frame.y * sy + OFFSET_Y),
                    LJS.vec2(f.frame.w * sx, f.frame.h * sy),
                    zombieSheet.textureInfo
                ));


            // console.log('Zombie frames:', this.zombieFrames.length); // should be 17
            // console.log('First zombie frame:', this.zombieFrames[0]);

            map.layers.forEach((layer, i) => {
                if (layer.type !== 'tilelayer') return;

                // ground first, walls on top, both behind normal objects
                this.tileLayers.push(
                    this.buildTileLayer(map, layer, tileset, firstGid, -100 + i)
                );
                // (colliders are now built above, before the tileset loads)
            });

            if (this.fitCamera) {
                LJS.setCameraPos(LJS.vec2(0, 0));
                LJS.setCameraScale(Math.floor(Math.min(
                    LJS.mainCanvasSize.x / map.width,
                    LJS.mainCanvasSize.y / map.height
                )));
            }

            console.log('Map loaded');
            // Load the first wave
            this.loadWaves();
            IS_FIRST_WAVE_LOADED = true;

        } catch (error) {
            console.error('Error loading map:', error);
        }
    }

    // Draws one Tiled layer using the loaded tileset
    buildTileLayer(map, layer, tileset, firstGid, renderOrder) {
        const size = LJS.vec2(map.width, map.height);
        const bottomLeft = LJS.vec2(-map.width / 2, -map.height / 2);

        const tileLayer = new LJS.TileLayer(
            bottomLeft, size, tileset, renderOrder
        );

        for (let row = 0; row < map.height; row++) {
            for (let col = 0; col < map.width; col++) {
                // strip Tiled flip flags from the high bits
                const gid = layer.data[row * map.width + col] & 0x1FFFFFFF;
                if (gid === 0) continue;

                // Tiled rows go top-down, LittleJS layers go bottom-up
                const layerPos = LJS.vec2(col, map.height - 1 - row);
                tileLayer.setData(
                    layerPos,
                    new LJS.TileLayerData(gid - firstGid)
                );
            }
        }

        tileLayer.redraw();
        return tileLayer;
    }

    // One collider per horizontal run of wall tiles
    buildColliders(map, layer) {
        const startX = -map.width / 2;
        const startY = map.height / 2;
        const isWall = (c, r) =>
            (layer.data[r * map.width + c] & 0x1FFFFFFF) !== 0;

        for (let row = 0; row < map.height; row++) {
            let col = 0;
            while (col < map.width) {
                if (!isWall(col, row)) { col++; continue; }

                const runStart = col;
                while (col < map.width && isWall(col, row)) col++;
                const runLength = col - runStart;

                const x = startX + runStart + runLength / 2;
                const y = startY - row - 0.5;

                const wall = new Wall(LJS.vec2(x, y), LJS.vec2(runLength, 1));
                this.walls.push(wall);
                Objects.push(wall);
            }
        }
    }

    loadWaves(){
        if(WAVE_COUNT >1){ 
            
            setGameEnd();
            return;
        }
        for(let c = 0; c<2*WAVE_COUNT; c++){
            // keep the sprite's 241x222 aspect ratio so it isn't squashed
            const zombieSize = LJS.vec2(2, 2 * ZOMBIE_FRAME_H / ZOMBIE_FRAME_W);
            const spawnPos =this.getValidSpawnPosition(zombieSize);
            if(spawnPos){
                const enemy = new Enemy(
                    spawnPos,
                    zombieSize,
                    Enemies.size,
                    this.zombieFrames
                );

                enemy.mirror = spawnPos.x > 0;   // flip when spawned on the right half of the map

                addObject("_Enemy", enemy, LJS.WHITE.copy());
            }
        }
        console.log("WAVES LOADED");
        IS_NEXT_WAVE_LOADED = true;
    }

    update(){
        
        if(IS_FIRST_WAVE_LOADED && Enemies.size == 0){
           IS_NEXT_WAVE_LOADED = false;
        }
        if(!IS_NEXT_WAVE_LOADED && IS_FIRST_WAVE_LOADED){
            IncrWaveCount();
            
            this.loadWaves();
        }

        for (const id of EneminesEliminated.keys()) {
            Enemies.delete(id);
        }

        EneminesEliminated.clear();


    }
    render() {}
}