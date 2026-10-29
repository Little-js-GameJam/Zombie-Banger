import * as LJS from 'littlejsengine';
import { Enemies } from './Objects';
import { Rectangle } from './primitives';



function getRandomInt(min, max) {

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function IsValidPosition(pos, halfWidth, halfHeight) {
    for (const enemy of Enemies.values()) {
        if (
            Math.abs(pos.x - enemy.pos.x) < halfWidth * 2 &&
            Math.abs(pos.y - enemy.pos.y) < halfHeight * 2
        ) {
            return false;
        }
    }
    return true;
}

export class Enemy{
    type= "_Enemy";
    id = 0;
    health = 0;
    isDead = false;
    EnemyHitBox;
    
    pos = LJS.vec2(0, 0);
    size = LJS.vec2(10, 10);
    color = LJS.RED.copy();
    
    SpawnEnemies() {
        const {x:CameraHalfWidth, y: CameraHalfHeight} = LJS.getCameraSize().scale(0.5);
        
        let random_pos= LJS.vec2(0,0);
        let attempts = 0;
        while (attempts < 100) {
            attempts++;
                
            random_pos = LJS.vec2(
                getRandomInt(-CameraHalfWidth, CameraHalfWidth),
                getRandomInt(-CameraHalfHeight, CameraHalfHeight)
            );

            if (IsValidPosition(random_pos,this.size.x*0.5,this.size.y*0.5)) {
                // Spawn enemy at random_pos  
                
                this.health = 100;
                this.isDead = false;
                this.EnemyHitBox = new Rectangle(random_pos,this.size);
                this.pos = random_pos;
                break;
            }
            
        }
        
    }
    constructor(id){
        this.id = id;
        this.SpawnEnemies();
    }



}