
import * as LJS from 'littlejsengine';
import { Objects } from './Objects.js';
import { BulletClass } from './bullet.js';

// Stores the ray segments calculated for rendering.
let RayDists = new Map();

// Temporary map used to calculate the next frame's ray segments.
// We swap the two maps after calculating the path.
let NextRayDists = new Map();

// Custom boolean as little js doesnt register click outside canvas.
let mouseWasPressed = false;

// Finds where a ray hits a rectangle.
// start    = starting position of the ray
// dir      = direction in which the ray travels
// rect     = rectangle we are checking

// Returns the hit point, surface normal and distance.
// Returns null if the ray misses the rectangle.
export function rayRecHit(start, dir, rect) {

    // A rectangle is defined by its center and its size.
    // Divide the size by 2 to calculate the distance from the center to each edge.
    const halfX = rect.size.x / 2;
    const halfY = rect.size.y / 2;

    // Calculate the four edges of the rectangle.
    const minX = rect.pos.x - halfX; // Left edge
    const maxX = rect.pos.x + halfX; // Right edge
    const minY = rect.pos.y - halfY; // Bottom edge
    const maxY = rect.pos.y + halfY; // Top edge

    // The ray follows this equation:
    // point = start + dir * t

    // t tells us how far along the ray we travel.

    // tMin = the latest entry into the rectangle's boundaries.
    // tMax = the earliest exit from the rectangle's boundaries.
    let tMin = -Infinity;
    let tMax = Infinity;

    // The normal is a vector perpendicular to the surface hit.
    let normal = null;

    // Check the X axis first, then the Y axis.
    //
    // Each array contains:
    // origin     = ray starting coordinate on this axis
    // direction  = ray direction on this axis
    // min, max   = rectangle boundaries on this axis
    // negNormal  = normal pointing toward the negative axis
    // posNormal  = normal pointing toward the positive axis
    //
    // For X:
    // Left face normal  = (-1, 0)
    // Right face normal = ( 1, 0)
    //
    // For Y:
    // Bottom face normal = (0, -1)
    // Top face normal    = (0,  1)
    for (const [
        origin,
        direction,
        min,
        max,
        negNormal,
        posNormal
    ] of [
        [
            start.x,
            dir.x,
            minX,
            maxX,
            LJS.vec2(-1, 0),
            LJS.vec2(1, 0)
        ],
        [
            start.y,
            dir.y,
            minY,
            maxY,
            LJS.vec2(0, -1),
            LJS.vec2(0, 1)
        ]
    ]) {

        // If direction is approximately zero, the ray is
        // parallel to the two edges on this axis.
        if (Math.abs(direction) < 1e-8) {

            // The ray can never enter the rectangle if its
            // coordinate is outside this axis's boundaries.
            if (origin < min || origin > max)
                return null;

            // The ray is inside this axis's range.
            // This axis does not restrict the intersection,
            // so continue checking the other axis.
            continue;
        }

        // Calculate when the ray crosses the minimum and
        // maximum boundaries of this axis.
        //
        // Formula:
        // t = (boundary - origin) / direction
        let t1 = (min - origin) / direction;
        let t2 = (max - origin) / direction;

        // Initially assume the ray enters through the
        // minimum boundary, whose normal is negNormal.
        let entryNormal = negNormal;

        // If t1 > t2, the ray is moving in the opposite
        // direction across these boundaries.
        //
        // Swap the times so t1 is always the entry time
        // and t2 is always the exit time for this axis.
        //
        // The ray then enters through the maximum boundary,
        // so the entry normal must also change.
        if (t1 > t2) {
            [t1, t2] = [t2, t1];
            entryNormal = posNormal;
        }

        // Keep the latest entry time across both axes.
        //
        // The ray must be inside both the X and Y ranges
        // simultaneously to be inside the rectangle.
        if (t1 > tMin) {
            tMin = t1;

            // Remember the normal of the face through
            // which the ray enters the rectangle.
            normal = entryNormal;
        }

        // Keep the earliest exit time across both axes.
        tMax = Math.min(tMax, t2);

        // If the entry happens after the exit, the X and Y
        // intervals do not overlap. Therefore, no hit exists.
        if (tMin > tMax)
            return null;
    }

    // If even the exit point is behind the ray's origin,
    // the rectangle is entirely behind the ray.
    if (tMax < 0)
        return null;

    // If tMin is negative, the ray started inside the
    // rectangle. In that case, use the exit time instead.
    //
    // Your current implementation sets the normal to null.
    // CalculatePath ignores hits without a normal, so these
    // inside-rectangle intersections will not cause reflection.
    if (tMin < 0) {
        tMin = tMax;
        normal = null;
    }

    // Calculate the actual point where the ray intersects.
    //
    // point = start + dir * tMin
    return {
        hit: true,

        point: LJS.vec2(
            start.x + dir.x * tMin,
            start.y + dir.y * tMin
        ),

        // Direction perpendicular to the hit surface.
        normal,

        // Convert tMin into a geometric distance.
        // This multiplication accounts for the length of dir.
        distance: tMin * Math.sqrt(
            dir.x * dir.x + dir.y * dir.y
        )
    };
}


// Used as the key for each ray segment in the Map.
// Reset to zero every frame.
let index = 0;


// Calculates the complete ray path, including reflections.
//
// start       = origin used for intersection calculations
// dir         = current ray direction
// n_bounces   = remaining segments/hits allowed by recursion
// maxDistance = maximum length of each ray segment
// drawStart   = starting point used to draw this segment
// rayMap      = Map where the resulting segments are stored
function CalculatePath(
    start,
    dir,
    n_bounces,
    maxDistance = 2000,
    drawStart = start,
    rayMap = RayDists
) {

    // Base case of recursion.
    // Stop if there are no remaining segments to calculate.
    if (n_bounces <= 0)
        return;

    // Convert the direction to a unit vector (length = 1).
    dir = dir.normalize();

    // We have not found any hit yet.
    let nearestHit = null;

    // Infinity ensures that the first valid hit is closer.
    let nearestDistance = Infinity;

    // Check every rectangle in the game.
    for (const rect of Objects) {

        // Find where this ray intersects the current rectangle.
        const hit = rayRecHit(start, dir, rect);

        // Ignore the rectangle if:
        // 1. The ray missed it.
        // 2. It has no valid surface normal.
        if (!hit || !hit.normal)
            continue;

        // Calculate the distance between the ray origin
        // and this rectangle's hit point.
        const distance = hit.point.subtract(start).length();

        // Only accept a hit that:
        // 1. Is not extremely close to the origin.
        // 2. Is closer than the nearest hit found so far.
        //
        // This ensures that we reflect from the first
        // obstacle the ray encounters, not an obstacle behind it.
        if (distance > 1e-4 && distance < nearestDistance) {
            nearestDistance = distance;
            nearestHit = hit;
        }
    }

    // If no rectangle was hit, or the nearest hit is farther
    // away than maxDistance, draw the ray to its maximum length.
    if (!nearestHit || nearestDistance > maxDistance) {

        rayMap.set(index++, {
            start: drawStart,

            // Move from start in the direction of the ray
            // by maxDistance units.
            end: start.add(dir.scale(maxDistance))
        });

        // There is nothing more to reflect from.
        return;
    }

    // A rectangle was hit within maxDistance.
    // Store the ray segment from its drawing origin
    // to the exact point where the ray hits the rectangle.
    rayMap.set(index++, {
        start: drawStart,
        end: nearestHit.point
    });

    // Calculate the reflected direction using:
    //
    // reflected = dir - 2 * dot(dir, normal) * normal
    //
    // dir.dot(normal) measures the direction's component
    // along the surface normal.
    //
    // Reversing this component makes the ray bounce.
    // normalize() ensures the result is a unit direction.
    const reflected = dir.subtract(
        nearestHit.normal.scale(
            2 * dir.dot(nearestHit.normal)
        )
    ).normalize();

    // The next ray starts at the point where the current
    // ray hit the rectangle.
    const nextStart = nearestHit.point;

    // Calculate the next segment recursively:
    // - Start from the hit point.
    // - Travel in the reflected direction.
    // - Decrease the remaining bounce count by one.
    // - Keep storing segments in the same Map.
    CalculatePath(
        nextStart,
        reflected,
        n_bounces - 1,
        maxDistance,
        nearestHit.point,
        rayMap
    );
}


// The player object inherits functionality from LittleJS.
export class PlayerClass extends LJS.EngineObject {

    // Current mouse position in world coordinates.
    mousePosLoc = LJS.vec2(0, 0);

    // Radius used to draw the player.
    player_size = 0;

    // These properties are currently not used in the ray logic.
    angle_of_trajectory = 0;
    playerStartPos = LJS.vec2(0);
    bullets = [];
    startMoving = false;

    constructor(pos, p_s) {

        // Initialize the inherited EngineObject at pos.
        super(pos);

        // Store the player's size.
        this.player_size = p_s;

        // Remember the initial player position.
        this.playerStartPos = this.pos;
    } 

    fireBullet() {
        const bullet = new BulletClass(
            this.pos,
            LJS.mousePos
        );

        this.bullets.push(bullet);
    } 

    update() {

        document.body.addEventListener('click', function() {
            mouseWasPressed = true; 
        });


        // Clear the Map that will contain the newly calculated
        // ray path for this frame.
        NextRayDists.clear();

        // Restart the segment numbering for this frame.
        index = 0;

        // Get the current mouse position.
        this.mousePosLoc = LJS.mousePos;

        // The player is the origin of the first ray.
        const start_pos = this.pos;

        // Calculate a direction pointing from the player
        // toward the mouse.
        //
        // mouse position - player position = direction vector
        const dir = this.mousePosLoc.subtract(this.pos).normalize();

        // Calculate the ray path:
        // - Up to three hit-ending segments.
        // - Each segment has a maximum length of 2000.
        // - The first segment starts at the player.
        // - Store all segments in NextRayDists.
        CalculatePath(
            start_pos,
            dir,
            3,
            2000,
            start_pos,
            NextRayDists
        );

        // Swap the Maps:
        // The newly calculated path becomes the render path.
        // The old render Map becomes the temporary Map.
        [RayDists, NextRayDists] = [NextRayDists, RayDists];


        if (mouseWasPressed) {
            
            this.fireBullet();
            // console.log("Pressed");
            mouseWasPressed = false;
        }
    }

    

    render() {

        // Draw the player as a green circle.
        LJS.drawCircle(
            this.pos,
            this.player_size,
            LJS.GREEN
        );

        // Draw the mouse position as a small red circle.
        LJS.drawCircle(
            this.mousePosLoc,
            0.8,
            LJS.BLACK
        );

        // Draw every segment of the calculated ray path.
        RayDists.forEach(element => {
            LJS.drawLine(
                element.start,
                element.end,
                0.1,
                LJS.GRAY
            );
        });
    }
}