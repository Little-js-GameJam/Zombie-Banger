
export const Objects = [];

export const Enemies = new Map();

export const EneminesEliminated = new Map();

export function addObject(type,object,clr) { // replace clr with texture
    object.color = clr;
    object.type = type;
    if(type === "_Enemy"){
        if(object.EnemyHitBox){
            Enemies.set(Enemies.size,object);
            return;
        }
    }
    Objects.push(object);
}

export function deleteEnemy(id){
    let temp_obj = Objects;

    for(const enemy of Enemies){
        if(enemy.id === id){
            temp_obj.push(enemy);
        }
    }

    Objects = temp_obj;


}