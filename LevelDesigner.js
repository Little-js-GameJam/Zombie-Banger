import * as LJS from 'littlejsengine';
import { Objects } from './Objects.js';

const MAP_URL = '/assets/level/level1/zbLevel1.tmj';
const TILESET_URL = '/assets/level/jawbreaker_tiles.png';
// CHANGED: on for now. Red boxes = exactly what the ray and bullets collide with.
const SHOW_COLLISION_DEBUG = false;

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

        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.fitCamera = fitCamera;

        this.tileLayers = [];
        this.walls = [];

        this.loadMap();
    }

    async loadMap() {
        try {
            const response = await fetch(MAP_URL);
            if (!response.ok)
                throw new Error(`Failed to load map: ${response.status}`);

            const map = await response.json();

            // 1 tile = 1 world unit, map centered on (0, 0)
            const firstGid = map.tilesets[0].firstgid;

            // CHANGED: build colliders first. They don't need the tileset, so
            // a tileset/drawing problem can no longer leave the level without
            // collisions, and walls exist from the first frame.
            const wallLayer = map.layers.find(l => l.name === 'walls');
            if (wallLayer) this.buildColliders(map, wallLayer);
            // CHANGED: confirms the JSON walls became colliders in Objects
            console.log('wall colliders from JSON:', this.walls.length,
                '| Objects total:', Objects.length);

            // loadSprite returns a TileInfo that is filled in once loaded
            const tileset = LJS.loadSprite(
                TILESET_URL,
                LJS.vec2(map.tilewidth, map.tileheight)
            );
            await LJS.spritesReady();

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

    // LevelDesigner itself draws nothing
    render() {}
}