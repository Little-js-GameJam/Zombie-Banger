import * as LJS from "littlejsengine";

import {
  ExtraBounceUpgrade,
  SplitOnDestroyUpgrade,
  SplitOnHitUpgrade,
  FasterFireUpgrade,
  ExtraPiercingUpgrade,
} from "./upgrades.js";

// Every upgrade that can ever be offered.
export const UPGRADE_POOL = [
  ExtraBounceUpgrade,
  SplitOnDestroyUpgrade,
  SplitOnHitUpgrade,
  FasterFireUpgrade,
  ExtraPiercingUpgrade,
];

// Picks different upgrades using their static weights.
// Unavailable upgrades are excluded.
function rollUpgrades(player, count) {
  const candidates = UPGRADE_POOL.filter((UpgradeClass) =>
      UpgradeClass.isAvailable(player)
  );

  const picked = [];

  while (picked.length < count && candidates.length > 0) {
    const totalWeight = candidates.reduce(
      (sum, UpgradeClass) => sum + UpgradeClass.weight,
      0,
    );

    let roll = Math.random() * totalWeight;
    let index = 0;

    for (; index < candidates.length - 1; index++) {
      roll -= candidates[index].weight;

      if (roll <= 0) break;
    }

    picked.push(candidates[index]);

    // Prevent duplicate upgrades in the same offer.
    candidates.splice(index, 1);
  }

  return picked;
}

// Displays upgrade cards in the center of the screen.
export class UpgradeMenu {
  cards = [];
  closedFrame = -1;

  constructor(player, onFinished = null) {
    this.player = player;
    this.onFinished = onFinished;
  }

  get isOpen() {
    return this.cards.length > 0;
  }

  // True during the frame the menu closes.
  get justClosed() {
    return LJS.frame === this.closedFrame;
  }

  // spacing is measured in screen pixels.
  open(count = 3, spacing = 240) {
    if (this.isOpen) return;
    const choices = rollUpgrades(this.player, count);

    // No available upgrades: continue to the next wave.
    if (choices.length === 0) {
      this.onFinished?.();
      return;
    }

    // Calculate spacing based on available screen width.
    const screenWidth = LJS.mainCanvasSize.x;

    spacing = Math.min(
      spacing,
      (screenWidth - 220) / Math.max(choices.length - 1, 1),
    );

    // UI root elements are positioned relative to
    // the center of the screen.
    const startX = -((choices.length - 1) * spacing) / 2;

    const centerY = 0;

    // Create cards around the screen center.
    this.cards = choices.map((UpgradeClass, index) => {
      const pos = LJS.vec2(startX + index * spacing, centerY);

      const card = new UpgradeClass(pos);

      card.setTarget(this.player);

      card.onPicked = () => {
        this.close();
      };

      return card;
    });
  }

  // Remove all cards and finish the selection.
  close() {
    if (!this.isOpen) return;

    for (const card of this.cards) {
      card.dispose();
    }

    this.cards = [];

    this.closedFrame = LJS.frame;

    this.onFinished?.();
  }
}


