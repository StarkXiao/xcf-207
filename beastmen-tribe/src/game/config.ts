import Phaser from 'phaser';
import { VillageScene } from './VillageScene';

export const createGame = (container: HTMLDivElement) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 800,
    height: 500,
    backgroundColor: '#2d4a2d',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [VillageScene],
    render: {
      pixelArt: false,
    },
  });
};
