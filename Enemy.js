import * as LJS from 'littlejsengine';
import { Rectangle } from './primitives';


export class Enemy extends LJS.EngineObject{
    type= "_Enemy";
    id = 0;
    health = 0;
    isDead = false;
    EnemyHitBox;
    
    color = LJS.RED.copy();
    
    constructor(pos,size,id){
        super(pos,size);
        this.health = 100;
        this.EnemyHitBox = new Rectangle(pos,size);

        this.id = id;
    }

}