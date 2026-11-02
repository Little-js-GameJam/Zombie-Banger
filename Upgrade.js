import * as LJS from "littlejsengine";

// Base class for all upgrades, built on LittleJS's UI plugin.
//
// An upgrade is a clickable UIButton card with an optional sprite, a name
// and a description. Extend it and override apply() to change the player's
// stats when the card is clicked.
//
// Positions and sizes are in screen pixels (not world units).
export class Upgrade extends LJS.UIButton {
  // How likely this upgrade is to be offered (higher = more common).
  static weight = 1;

  // Return false to keep this upgrade out of the pool
  // (already owned, maxed out, not useful yet, etc.).
  static isAvailable(player) {
    return true;
  }

  name = "Upgrade";
  description = "";
  picked = false;

  // Whatever the upgrade modifies, usually the player.
  target = null;

  // Called after the upgrade has been applied.
  onPicked = null;

  // options: { name, description, tileInfo, size, color }
  constructor(pos, options = {}) {
    const size = options.size ?? LJS.vec2(200, 260);

    super(pos, size, "", options.color ?? LJS.rgb(40, 40, 40));

    this.name = options.name ?? this.name;
    this.description = options.description ?? this.description;

    // Sprite, centered in the upper part of the card.
    if (options.tileInfo) {
      this.addChild(
        new LJS.UITile(
          LJS.vec2(0, -size.y * 0.12),
          LJS.vec2(size.x * 0.6),
          options.tileInfo,
        ),
      );
    }

    // Name.
    this.addChild(
      new LJS.UIText(
        LJS.vec2(0, size.y * 0.28),
        LJS.vec2(size.x * 0.9, 28),
        this.name,
      ),
    );

    // Description.
    if (this.description) {
      this.addChild(
        new LJS.UIText(
          LJS.vec2(0, size.y * 0.4),
          LJS.vec2(size.x * 0.9, 18),
          this.description,
        ),
      );
    }
  }

  // Set what the upgrade modifies. Returns this so calls can be chained.
  setTarget(target) {
    this.target = target;
    return this;
  }

  // ---- Override these in subclasses --------------------------------

  // Called once when the upgrade is clicked.
  apply(target) {}

  // Return false to block the pick for this specific card.
  canApply(target) {
    return true;
  }

  // ---- Internals ---------------------------------------------------

  pick() {
    if (this.picked) return;
    if (!this.canApply(this.target)) return;

    this.picked = true;
    this.apply(this.target);

    if (this.onPicked) this.onPicked(this);
  }

  // Different LittleJS versions fire different events for a click.
  // pick() ignores repeats, so handling both is safe.
  onPress() {
    this.pick();
  }

  onClick() {
    this.pick();
  }

  // Remove the card from the screen.
  dispose() {
    if (typeof this.destroy === "function") {
      this.destroy();
    } else {
      // Older UI plugin has no destroy(): hiding stops update and render
      // for this card and its children.
      this.visible = false;
    }
  }
}
