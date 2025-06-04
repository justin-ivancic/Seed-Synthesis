const CROP_DATA = {
  wheat:      { seedCost: 5,  harvestPrice: 12, growthTime: 9  },
  corn:       { seedCost: 8,  harvestPrice: 18, growthTime: 12 },
  tomato:     { seedCost: 10, harvestPrice: 22, growthTime: 15 },
  carrot:     { seedCost: 6,  harvestPrice: 14, growthTime: 8  },
  flower:     { seedCost: 4,  harvestPrice: 10, growthTime: 6  },
  glowshroom: { seedCost: 12, harvestPrice: 30, growthTime: 18 }
};

const TILE_SIZE = 32;
const SIDEBAR_WIDTH = TILE_SIZE * 2;
const MONEY_ICON_SIZE = 24;
const BANNER_WIDTH = 200;
const BANNER_HEIGHT = 50;
const GRID_ROWS = 15;
const GRID_COLS = 15;
const INITIAL_MONEY = 100;
const BANNER_DURATION = 2000;

class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  preload() {
    this.load.image('tile_empty', 'assets/default/tile_empty.png');
    this.load.image('crop_wheat', 'assets/default/crop_wheat.png');
    this.load.image('crop_corn', 'assets/default/crop_corn.png');
    this.load.image('crop_tomato', 'assets/default/crop_tomato.png');
    this.load.image('crop_carrot', 'assets/default/crop_carrot.png');
    this.load.image('crop_flower', 'assets/default/crop_flower.png');
    this.load.image('crop_glowshroom', 'assets/default/crop_glowshroom.png');
    this.load.image('banner_seedsynthesis', 'assets/default/banner_seedsynthesis.png');
    this.load.image('ui_playbutton', 'assets/default/ui_playbutton.png');
    this.load.image('ui_notenoughmoney', 'assets/default/ui_notenoughmoney.png');
    this.load.image('ui_money', 'assets/default/ui_money.png');
    this.load.image('ui_clearcropselection', 'assets/default/ui_clearcropselection.png');
    this.load.image('ui_lab', 'assets/default/ui_lab.png');
    this.load.image('ui_scythe', 'assets/default/ui_scythe.png');
  }
  create() {
    this.scene.start('Title');
  }
}

class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }
  create() {
    const banner = this.add.image(
      SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2,
      BANNER_HEIGHT / 2,
      'banner_seedsynthesis'
    );
    banner.displayWidth = GRID_COLS * TILE_SIZE;
    banner.displayHeight = BANNER_HEIGHT;

    const playButton = this.add.image(
      SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2,
      BANNER_HEIGHT + 40,
      'ui_playbutton'
    );
    playButton.setInteractive();
    playButton.on('pointerdown', () => this.scene.start('Farm'));
  }
}

class Farm extends Phaser.Scene {
  constructor() {
    super('Farm');
    this.gridState = [];
    this.plantSprites = [];
    this.money = INITIAL_MONEY;
    this.selectedCrop = null;
    this.ghostSprite = null;
    this.bannerVisible = false;
    this.bannerTimer = null;
  }

  create() {
    this.gridState = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.plantSprites = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const tile = this.add.image(x, y, 'tile_empty');
        tile.displayWidth = TILE_SIZE;
        tile.displayHeight = TILE_SIZE;
      }
    }

    this.moneyIcon = this.add.image(TILE_SIZE / 2, TILE_SIZE / 2, 'ui_money');
    this.moneyIcon.displayWidth = MONEY_ICON_SIZE;
    this.moneyIcon.displayHeight = MONEY_ICON_SIZE;
    this.moneyText = this.add.text(TILE_SIZE, TILE_SIZE / 4, '$' + this.money, {
      font: '16px Arial',
      color: '#fff'
    });

    this.bannerImage = this.add.image(
      SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2,
      BANNER_HEIGHT / 2,
      'ui_notenoughmoney'
    );
    this.bannerImage.displayWidth = BANNER_WIDTH;
    this.bannerImage.displayHeight = BANNER_HEIGHT;
    this.bannerImage.setVisible(false);

    const clearBtn = this.add.image(TILE_SIZE / 2, TILE_SIZE * 2, 'ui_clearcropselection');
    clearBtn.displayWidth = TILE_SIZE;
    clearBtn.displayHeight = TILE_SIZE;
    clearBtn.setInteractive();
    clearBtn.on('pointerdown', () => this.clearSelection());

    const cropKeys = ['wheat', 'corn', 'tomato', 'carrot', 'flower', 'glowshroom'];
    cropKeys.forEach((cropKey, i) => {
      const x = TILE_SIZE / 2;
      const y = TILE_SIZE * (3 + i);
      const icon = this.add.image(x, y, 'crop_' + cropKey);
      icon.displayWidth = TILE_SIZE;
      icon.displayHeight = TILE_SIZE;
      icon.setInteractive();
      icon.on('pointerdown', () => this.selectCrop(cropKey));

      const statsY = y + TILE_SIZE / 2 + 4;
      this.add.text(TILE_SIZE, statsY, `Cost: $${CROP_DATA[cropKey].seedCost}`,
        { font: '14px Arial', color: '#fff' });
      this.add.text(TILE_SIZE, statsY + 14, `Sell: $${CROP_DATA[cropKey].harvestPrice}`,
        { font: '14px Arial', color: '#fff' });
      this.add.text(TILE_SIZE, statsY + 28, `Time: ${CROP_DATA[cropKey].growthTime}s`,
        { font: '14px Arial', color: '#fff' });
    });

    this.input.on('pointerdown', (pointer) => {
      const col = Math.floor((pointer.worldX - SIDEBAR_WIDTH) / TILE_SIZE);
      const row = Math.floor(pointer.worldY / TILE_SIZE);
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        this.attemptPlantOrHarvest(row, col);
      }
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('Title');
    });

    this.loadGame();

    this.time.addEvent({
      delay: 1000,
      callback: this.updateGrowth,
      callbackScope: this,
      loop: true
    });
  }

  selectCrop(cropKey) {
    this.selectedCrop = cropKey;
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
    }
    this.ghostSprite = this.add.image(0, 0, 'crop_' + cropKey);
    this.ghostSprite.displayWidth = TILE_SIZE;
    this.ghostSprite.displayHeight = TILE_SIZE;
    this.ghostSprite.setAlpha(0.5);
    this.ghostSprite.setDepth(1000);

    if (this.pointerMoveListener) {
      this.input.off('pointermove', this.pointerMoveListener, this);
    }
    this.pointerMoveListener = (pointer) => {
      const col = Math.floor((pointer.worldX - SIDEBAR_WIDTH) / TILE_SIZE);
      const row = Math.floor(pointer.worldY / TILE_SIZE);
      if (
        row >= 0 && row < GRID_ROWS &&
        col >= 0 && col < GRID_COLS &&
        this.gridState[row][col] === null
      ) {
        this.ghostSprite.setVisible(true);
        this.ghostSprite.x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
        this.ghostSprite.y = row * TILE_SIZE + TILE_SIZE / 2;
      } else {
        this.ghostSprite.setVisible(false);
      }
    };
    this.input.on('pointermove', this.pointerMoveListener, this);
  }

  clearSelection() {
    this.selectedCrop = null;
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
    if (this.pointerMoveListener) {
      this.input.off('pointermove', this.pointerMoveListener, this);
      this.pointerMoveListener = null;
    }
  }

  attemptPlantOrHarvest(row, col) {
    const cell = this.gridState[row][col];
    const now = Date.now();

    if (cell && (now - cell.plantedAt) / 1000 >= cell.growthTime) {
      this.harvestCrop(row, col);
      return;
    }

    if (!cell && this.selectedCrop) {
      const cropType = this.selectedCrop;
      const cost = CROP_DATA[cropType].seedCost;
      if (this.money < cost) {
        this.showBanner();
        return;
      }
      this.money -= cost;
      this.updateMoneyText();
      const x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      const sprite = this.add.image(x, y, 'crop_' + cropType);
      sprite.displayWidth = TILE_SIZE;
      sprite.displayHeight = TILE_SIZE;
      sprite.setScale(0.1);
      this.plantSprites[row][col] = sprite;
      this.gridState[row][col] = {
        cropType,
        plantedAt: now,
        growthTime: CROP_DATA[cropType].growthTime
      };
      this.saveGame();
    }
  }

  harvestCrop(row, col) {
    const cell = this.gridState[row][col];
    const cropType = cell.cropType;
    this.plantSprites[row][col].destroy();
    this.plantSprites[row][col] = null;
    this.gridState[row][col] = null;
    this.money += CROP_DATA[cropType].harvestPrice;
    this.updateMoneyText();
    this.saveGame();
  }

  showBanner() {
    if (this.bannerVisible) return;
    this.bannerVisible = true;
    this.bannerImage.setVisible(true);
    this.bannerImage.x = SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2;
    this.bannerImage.y = BANNER_HEIGHT / 2;
    if (this.bannerTimer) {
      this.bannerTimer.remove(false);
    }
    this.bannerTimer = this.time.delayedCall(BANNER_DURATION, () => {
      this.bannerImage.setVisible(false);
      this.bannerVisible = false;
    });
  }

  updateMoneyText() {
    this.moneyText.setText('$' + this.money);
  }

  saveGame() {
    const data = {
      money: this.money,
      gridState: this.gridState
    };
    localStorage.setItem('seedSynthesisSave', JSON.stringify(data));
  }

  loadGame() {
    const saved = localStorage.getItem('seedSynthesisSave');
    if (!saved) {
      this.updateMoneyText();
      return;
    }
    const data = JSON.parse(saved);
    this.money = data.money;
    this.updateMoneyText();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = data.gridState[row][col];
        if (cell) {
          const elapsed = (Date.now() - cell.plantedAt) / 1000;
          const progress = Math.min(1, elapsed / cell.growthTime);
          const scale = 0.1 + 0.9 * progress;
          const x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
          const y = row * TILE_SIZE + TILE_SIZE / 2;
          const sprite = this.add.image(x, y, 'crop_' + cell.cropType);
          sprite.displayWidth = TILE_SIZE;
          sprite.displayHeight = TILE_SIZE;
          sprite.setScale(scale);
          this.plantSprites[row][col] = sprite;
          this.gridState[row][col] = {
            cropType: cell.cropType,
            plantedAt: cell.plantedAt,
            growthTime: cell.growthTime
          };
        }
      }
    }
  }

  updateGrowth() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.gridState[row][col];
        if (cell) {
          const elapsed = (Date.now() - cell.plantedAt) / 1000;
          const progress = Math.min(1, elapsed / cell.growthTime);
          const scale = 0.1 + 0.9 * progress;
          this.plantSprites[row][col].setScale(scale);
        }
      }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE,
  height: GRID_ROWS * TILE_SIZE,
  scene: [Boot, Title, Farm],
  backgroundColor: '#222'
};

new Phaser.Game(config);
