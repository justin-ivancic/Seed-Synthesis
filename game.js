const CROP_DATA = {
  wheat:      { seedCost: 5,  harvestPrice: 12, growthTime: 9  },
  corn:       { seedCost: 8,  harvestPrice: 18, growthTime: 12 },
  tomato:     { seedCost: 10, harvestPrice: 22, growthTime: 15 },
  carrot:     { seedCost: 6,  harvestPrice: 14, growthTime: 8  },
  flower:     { seedCost: 4,  harvestPrice: 10, growthTime: 6  },
  glowshroom: { seedCost: 12, harvestPrice: 30, growthTime: 18 }
};

const TILE_SIZE       = 32;   // pixel size for each grid cell
const SIDEBAR_WIDTH   = TILE_SIZE * 2; // two columns wide
const GRID_ROWS       = 15;
const GRID_COLS       = 15;
const INITIAL_MONEY   = 100;
const BANNER_DURATION = 2000; // milliseconds

// Asset Scale and Layout Constants
const TILE_SPRITE_SIZE        = { width: 32, height: 32 };       // ground tile
const CROP_SPRITE_SIZE        = { width: 32, height: 32 };       // crops
const UI_MONEY_SIZE           = { width: 24, height: 24 };       // money icon
const UI_BANNER_SIZE          = { width: 200, height: 50 };      // "Not Enough Money" banner
const UI_CLEAR_BUTTON_SIZE    = { width: 32, height: 32 };       // clear-selection button
const UI_NEWGAME_BUTTON_SIZE  = { width: 64, height: 32 };       // new-game button
const CANVAS_WIDTH  = SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE;
const CANVAS_HEIGHT = GRID_ROWS * TILE_SIZE;

class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('tile_empty',      'assets/default/tile_empty.png');
    this.load.image('crop_wheat',      'assets/default/crop_wheat.png');
    this.load.image('crop_corn',       'assets/default/crop_corn.png');
    this.load.image('crop_tomato',     'assets/default/crop_tomato.png');
    this.load.image('crop_carrot',     'assets/default/crop_carrot.png');
    this.load.image('crop_flower',     'assets/default/crop_flower.png');
    this.load.image('crop_glowshroom', 'assets/default/crop_glowshroom.png');
    this.load.image('banner_seedsynthesis', 'assets/default/banner_seedsynthesis.png');
    this.load.image('ui_playbutton',        'assets/default/ui_playbutton.png');
    this.load.image('ui_notenoughmoney',    'assets/default/ui_notenoughmoney.png');
    this.load.image('ui_money',             'assets/default/ui_money.png');
    this.load.image('ui_clearcropselection','assets/default/ui_clearcropselection.png');
    this.load.image('ui_newgame',           'assets/default/ui_newgame.png');
    // Also load these unused assets so they’re available:
    this.load.image('ui_lab',   'assets/default/ui_lab.png');
    this.load.image('ui_scythe','assets/default/ui_scythe.png');
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
    this.add.image(
      (SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE) / 2,
      UI_BANNER_SIZE.height / 2,
      'banner_seedsynthesis'
    ).setDisplaySize(CANVAS_WIDTH, UI_BANNER_SIZE.height);

    const playButton = this.add.image(
      (SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE) / 2,
      UI_BANNER_SIZE.height + TILE_SIZE,
      'ui_playbutton'
    )
      .setDisplaySize(TILE_SIZE * 2, TILE_SIZE)
      .setInteractive();
    playButton.on('pointerdown', () => {
      this.scene.start('Farm');
    });
  }
}

class Farm extends Phaser.Scene {
  constructor() {
    super('Farm');
  }

  create() {
    // a. Initialize State Variables
    this.gridState    = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.plantSprites = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.money         = INITIAL_MONEY;
    this.selectedCrop  = null;
    this.ghostSprite   = null;
    this.bannerVisible = false;
    this.bannerTimer   = null;

    // b. Draw the 15×15 Grid Background
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
        let y = row * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(x, y, 'tile_empty')
          .setDisplaySize(TILE_SPRITE_SIZE.width, TILE_SPRITE_SIZE.height);
        this.plantSprites[row][col] = null;
      }
    }

    // c. Sidebar UI
    // 1. Money Display
    this.add.image(TILE_SIZE / 2, TILE_SIZE / 2, 'ui_money')
      .setDisplaySize(UI_MONEY_SIZE.width, UI_MONEY_SIZE.height);
    this.moneyText = this.add.text(
      TILE_SIZE + 5, TILE_SIZE / 2,
      "$" + this.money,
      { font: "18px Arial", fill: "#ffffff" }
    );

    // 2. Banner Placeholder
    this.bannerImage = this.add.image(
      SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2,
      UI_BANNER_SIZE.height / 2,
      'ui_notenoughmoney'
    )
      .setDisplaySize(UI_BANNER_SIZE.width, UI_BANNER_SIZE.height)
      .setVisible(false);

    // 3. “X” Clear-Selection Button
    let clearBtn = this.add.image(TILE_SIZE / 2, TILE_SIZE * 2, 'ui_clearcropselection')
                         .setDisplaySize(UI_CLEAR_BUTTON_SIZE.width, UI_CLEAR_BUTTON_SIZE.height)
                         .setInteractive();
    clearBtn.on('pointerdown', () => { this.clearSelection(); });

    // New Game Button
    let newGameBtn = this.add.image(TILE_SIZE / 2, TILE_SIZE * 9, 'ui_newgame')
                             .setDisplaySize(UI_NEWGAME_BUTTON_SIZE.width, UI_NEWGAME_BUTTON_SIZE.height)
                             .setInteractive();
    newGameBtn.on('pointerdown', () => { this.resetGame(); });

    // 4. Crop Icons + Stats
    let index = 0;
    for (let cropKey of Object.keys(CROP_DATA)) {
      let xIcon = TILE_SIZE / 2;
      let yIcon = TILE_SIZE * (3 + index);
      let icon = this.add.image(xIcon, yIcon, 'crop_' + cropKey)
                         .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
                         .setInteractive();
      this.add.text(xIcon + TILE_SIZE/2 + 5, yIcon - 8, "Cost: $" + CROP_DATA[cropKey].seedCost, { font: "14px Arial", fill: "#ffffff" });
      this.add.text(xIcon + TILE_SIZE/2 + 5, yIcon + 0,  "Sell: $" + CROP_DATA[cropKey].harvestPrice, { font: "14px Arial", fill: "#ffffff" });
      this.add.text(xIcon + TILE_SIZE/2 + 5, yIcon + 8,  "Time: " + CROP_DATA[cropKey].growthTime + "s", { font: "14px Arial", fill: "#ffffff" });
      icon.on('pointerdown', () => { this.selectCrop(cropKey); });
      index++;
    }

    // e. Planting & Harvesting - pointer listener
    this.input.on('pointerdown', pointer => {
      let worldX = pointer.x - SIDEBAR_WIDTH;
      let worldY = pointer.y;
      let col = Math.floor(worldX / TILE_SIZE);
      let row = Math.floor(worldY / TILE_SIZE);
      if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
      this.attemptPlantOrHarvest(row, col);
    });

    // j. ESC Key to Return to Title
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('Title');
    });

    // Load saved game state before timers
    this.loadGame();

    // i. Growth Timer
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
    this.ghostSprite = this.add.image(0, 0, 'crop_' + cropKey)
                              .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
                              .setAlpha(0.5)
                              .setDepth(1000);
    this.input.on('pointermove', pointer => {
      let worldX = pointer.x - SIDEBAR_WIDTH;
      let worldY = pointer.y;
      let col = Math.floor(worldX / TILE_SIZE);
      let row = Math.floor(worldY / TILE_SIZE);
      if (
        row >= 0 && row < GRID_ROWS &&
        col >= 0 && col < GRID_COLS &&
        this.gridState[row][col] === null
      ) {
        this.ghostSprite.setVisible(true);
        this.ghostSprite.setPosition(
          SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2,
          row * TILE_SIZE + TILE_SIZE/2
        );
      } else {
        this.ghostSprite.setVisible(false);
      }
    });
  }

  clearSelection() {
    this.selectedCrop = null;
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
    this.input.removeAllListeners('pointermove');
  }

  resetGame() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.plantSprites[row][col]) {
          this.plantSprites[row][col].destroy();
        }
        this.plantSprites[row][col] = null;
        this.gridState[row][col] = null;
      }
    }
    this.money = INITIAL_MONEY;
    this.updateMoneyText();
    localStorage.removeItem('seedSynthesisSave');
    this.clearSelection();
    this.bannerImage.setVisible(false);
    this.bannerVisible = false;
  }

  attemptPlantOrHarvest(row, col) {
    let cell = this.gridState[row][col];
    let now = Date.now();

    // If planted & fully grown, harvest
    if (cell !== null) {
      let elapsed = (now - cell.plantedAt) / 1000;
      if (elapsed >= cell.growthTime) {
        this.harvestCrop(row, col);
        return;
      }
    }

    // Otherwise, if empty & crop selected, plant
    if (cell === null && this.selectedCrop !== null) {
      let cropType = this.selectedCrop;
      let cost = CROP_DATA[cropType].seedCost;
      if (this.money < cost) {
        this.showBanner();
        return;
      }
      // Deduct cost, update money
      this.money -= cost;
      this.updateMoneyText();

      // Place new seedling sprite at 10% scale (but force 32×32 first)
      let x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
      let y = row * TILE_SIZE + TILE_SIZE/2;
      let sprite = this.add.image(x, y, 'crop_' + cropType)
                          .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
                          .setScale(0.1);
      this.plantSprites[row][col] = sprite;
      this.gridState[row][col] = {
        cropType: cropType,
        plantedAt: now,
        growthTime: CROP_DATA[cropType].growthTime
      };
      this.saveGame();
    }
  }

  harvestCrop(row, col) {
    let cell = this.gridState[row][col];
    let cropType = cell.cropType;
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
    this.bannerImage.setPosition(
      SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE)/2,
      UI_BANNER_SIZE.height/2
    );
    if (this.bannerTimer) {
      this.bannerTimer.remove();
    }
    this.bannerTimer = this.time.delayedCall(BANNER_DURATION, () => {
      this.bannerImage.setVisible(false);
      this.bannerVisible = false;
    });
  }

  updateMoneyText() {
    this.moneyText.setText("$" + this.money);
  }

  saveGame() {
    const saveData = {
      money: this.money,
      gridState: this.gridState.map(row =>
        row.map(cell => cell
          ? { cropType: cell.cropType, plantedAt: cell.plantedAt, growthTime: cell.growthTime }
          : null
        )
      )
    };
    localStorage.setItem('seedSynthesisSave', JSON.stringify(saveData));
  }

  loadGame() {
    let saved = JSON.parse(localStorage.getItem('seedSynthesisSave'));
    if (saved) {
      this.money = saved.money;
      this.updateMoneyText();
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          let cell = saved.gridState[row][col];
          if (cell !== null) {
            let elapsed = (Date.now() - cell.plantedAt) / 1000;
            let progress = Phaser.Math.Clamp(elapsed / cell.growthTime, 0, 1);
            let scale = 0.1 + 0.9 * progress;
            let x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
            let y = row * TILE_SIZE + TILE_SIZE/2;
            let sprite = this.add.image(x, y, 'crop_' + cell.cropType)
                                .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
                                .setScale(scale);
            this.plantSprites[row][col] = sprite;
            this.gridState[row][col] = {
              cropType: cell.cropType,
              plantedAt:   cell.plantedAt,
              growthTime:  cell.growthTime
            };
          }
        }
      }
    }
  }

  updateGrowth() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let cell = this.gridState[row][col];
        if (cell !== null) {
          let elapsed = (Date.now() - cell.plantedAt) / 1000;
          let progress = Phaser.Math.Clamp(elapsed / cell.growthTime, 0, 1);
          let scale = 0.1 + 0.9 * progress;
          this.plantSprites[row][col].setScale(scale);
        }
      }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#222',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: null,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  },
  scene: [Boot, Title, Farm]
};
new Phaser.Game(config);
