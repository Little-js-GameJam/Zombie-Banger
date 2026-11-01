
import * as LJS from 'littlejsengine';
import { Rectangle } from './primitives';

export class Enemy extends LJS.EngineObject {
    type = "_Enemy";
    id = 0;
    health = 0;
    isDead = false;
    EnemyHitBox;

    color = LJS.WHITE.copy();

    constructor(pos, size, id, zombieFrames) {
        super(pos, size);

        this.health = 100;
        this.EnemyHitBox = new Rectangle(pos, size);
        this.id = id;

        // Store all animation frames
        this.zombieFrames = zombieFrames;

        // Animation settings
        this.currentFrame = 0;
        this.animationSpeed = 0.10;
        this.animationTimer = 0;

        // Show first frame immediately
        this.tileInfo = this.zombieFrames[0];
    }
    
   update() {
        super.update();

        this.animationTimer += LJS.timeDelta;

        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer -= this.animationSpeed;
            this.currentFrame =
                (this.currentFrame + 1) % this.zombieFrames.length;

            
            this.tileInfo = this.zombieFrames[this.currentFrame];

            // console.log("Current zombie frame:", this.currentFrame);
        }
    }


}