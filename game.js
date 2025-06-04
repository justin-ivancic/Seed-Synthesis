const CROP_DATA = {
  wheat:      { seedCost: 5,  harvestPrice: 12, growthTime: 9  },
  corn:       { seedCost: 8,  harvestPrice: 18, growthTime: 12 },
  tomato:     { seedCost: 10, harvestPrice: 22, growthTime: 30 },
  carrot:     { seedCost: 6,  harvestPrice: 14, growthTime: 8  },
  flower:     { seedCost: 4,  harvestPrice: 10, growthTime: 60 },
  glowshroom: { seedCost: 12, harvestPrice: 30, growthTime: 120 }
};

// ---------------------------------------------------------------------------
// Asset Scale and Layout Constants
// ---------------------------------------------------------------------------
const TILE_SIZE              = 32;           // base size for the grid
const GRID_ROWS              = 15;
const GRID_COLS              = 15;
const SIDEBAR_WIDTH          = TILE_SIZE * 2; // width of crop list sidebar
const RIGHT_SIDEBAR_WIDTH    = TILE_SIZE * 2; // space on right for buttons

const CROP_ICON_SPACING      = TILE_SIZE * 1.5; // vertical spacing for crop icons
const CROP_TEXT_SIZE         = 12;

const TILE_SPRITE_SIZE       = { width: 32, height: 32 };
const CROP_SPRITE_SIZE       = { width: 32, height: 32 };
const UI_MONEY_SIZE          = { width: 24, height: 24 };
const UI_BANNER_SIZE         = { width: 96, height: 96 };  // banner icon enlarged 3x
const UI_CLEAR_BUTTON_SIZE   = { width: 32, height: 32 };
const UI_NEWGAME_BUTTON_SIZE = { width: 32, height: 32 };
const UI_UNLOCK_BUTTON_SIZE = { width: 32, height: 32 }; // unlock button base size
const UI_PLAY_BUTTON_SIZE    = { width: 64, height: 64 }; // play button enlarged 2x
const FARM_GIRL_SIZE         = { width: 160, height: 160 }; // congratulatory sprite size

const CANVAS_WIDTH           = SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE + RIGHT_SIDEBAR_WIDTH;
const CANVAS_HEIGHT          = GRID_ROWS * TILE_SIZE;

const INITIAL_MONEY   = 100;
const BANNER_DURATION = 2000; // milliseconds
const PARCEL_SIZE     = 5;
const UNLOCK_PRICES   = [
  1000, 5000, 10000, 25000, 100000, 200000, 300000, 1000000
];
const VERSION = "v.0.1.2";

// Intro timing constants (in milliseconds)
const INTRO_FADE_DURATION = 500;
const INTRO_DISPLAY_TIME  = 5000;

// Bounce animation constants for fully-grown crops
const BOUNCE_PIXELS   = 3;      // vertical bounce amount
const BOUNCE_SCALE    = 0.05;   // ±5% scale change
const BOUNCE_DURATION = 1000;   // duration of bounce cycle

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
    this.load.image('background', 'assets/default/background.png');
    this.load.image('banner_seedsynthesis', 'assets/default/banner_seedsynthesis.png');
    this.load.image('ui_playbutton',        'assets/default/ui_playbutton.png');
    this.load.image('ui_notenoughmoney',    'assets/default/ui_notenoughmoney.png');
    this.load.image('ui_money',             'assets/default/ui_money.png');
    this.load.image('ui_clearcropselection','assets/default/ui_clearcropselection.png');
    this.load.image('ui_newgame',          'assets/default/ui_newgame.png');
    this.load.image('ui_unlock',           'assets/default/ui_unlock.png');
    this.load.image('char_farmgirl',       'assets/default/char_farmgirl.png');
    this.load.image('char_farmgirl_dissatisfied',
                   'assets/default/char_farmgirl_dissatisfied.png');
    this.load.image('char_oldman', 'assets/default/char_oldman.png');
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
    const bg = this.add.image(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      'background'
    ).setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.setDepth(-1);

    this.add.image(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 - UI_PLAY_BUTTON_SIZE.height,
      'banner_seedsynthesis'
    ).setDisplaySize(
      UI_BANNER_SIZE.width * 3,
      UI_BANNER_SIZE.height * 3
    );

    const playButton = this.add.image(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + UI_PLAY_BUTTON_SIZE.height,
      'ui_playbutton'
    )
      .setDisplaySize(UI_PLAY_BUTTON_SIZE.width, UI_PLAY_BUTTON_SIZE.height)
      .setInteractive();
    playButton.on('pointerdown', () => {
      this.scene.start('Farm', { showIntro: true });
    });

    // Version display
    this.add.text(
      CANVAS_WIDTH - 4,
      CANVAS_HEIGHT - 4,
      VERSION,
      { font: '12px Arial', fill: '#ffffff' }
    )
      .setOrigin(1,1)
      .setDepth(2000);
  }
}

class Farm extends Phaser.Scene {
  constructor() {
    super('Farm');
  }

  create(data) {
    // a. Initialize State Variables
    this.gridState    = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.plantSprites = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.tileSprites  = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.lockTints    = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.unlockButtons = Array(9).fill(null);
    this.parcelsUnlocked = Array(9).fill(false);
    this.parcelsUnlocked[4] = true;
    this.unlockedCount = 1;
    this.money         = INITIAL_MONEY;
    this.selectedCrop  = null;
    this.ghostSprite   = null;
    this.bannerVisible = false;
    this.bannerTimer   = null;
    this.farmGirlShown = localStorage.getItem('farmGirlShown') === 'true';
    this.farmGirlTimer = null;

    // b. Draw the 15×15 Grid Background and lock overlays
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
        let y = row * TILE_SIZE + TILE_SIZE / 2;
        const tile = this.add.image(x, y, 'tile_empty')
          .setDisplaySize(TILE_SPRITE_SIZE.width, TILE_SPRITE_SIZE.height);
        this.tileSprites[row][col] = tile;
        this.plantSprites[row][col] = null;
        const tint = this.add.image(x, y, 'tile_empty')
          .setDisplaySize(TILE_SPRITE_SIZE.width, TILE_SPRITE_SIZE.height)
          .setTint(0x555555)
          .setAlpha(0.6)
          .setVisible(false)
          .setDepth(400);
        this.lockTints[row][col] = tint;
      }
    }

    // c. Sidebar UI
    // 1. Money Display
    let moneyX = SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2 - TILE_SIZE;
  this.add.image(moneyX, TILE_SIZE / 2, 'ui_money')
    .setDisplaySize(UI_MONEY_SIZE.width, UI_MONEY_SIZE.height)
    .setDepth(1000);
  this.moneyText = this.add.text(
    moneyX + TILE_SIZE / 2 + 4, TILE_SIZE / 2,
    "$" + this.money,
    { font: "18px Arial", fill: "#ffffff" }
  );
  this.moneyText.setDepth(1000);

    // Tooltip for unlock buttons
    this.unlockTooltip = this.add.text(0, 0, '', {
      font: '12px Arial',
      fill: '#ffffff',
      backgroundColor: '#000000'
    })
      .setPadding(4)
      .setVisible(false)
      .setDepth(1100);

    // Confirmation banner for unlocking parcels
    this.confirmContainer = this.add.container(0, 0).setVisible(false).setDepth(1100);
    const confirmBg = this.add.rectangle(0, 0, 220, 50, 0x000000, 0.8);
    this.confirmText = this.add.text(0, -10, '', { font: '14px Arial', fill: '#ffffff' }).setOrigin(0.5);
    this.confirmYes = this.add.text(-30, 10, '[Yes]', { font: '14px Arial', fill: '#00ff00' })
      .setOrigin(0.5)
      .setInteractive();
    this.confirmNo  = this.add.text(30, 10, '[No]', { font: '14px Arial', fill: '#ff0000' })
      .setOrigin(0.5)
      .setInteractive();
    this.confirmContainer.add([confirmBg, this.confirmText, this.confirmYes, this.confirmNo]);

    // 2. Banner Placeholder
    this.bannerImage = this.add.image(
      SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2,
      UI_BANNER_SIZE.height / 2,
      'ui_notenoughmoney'
    )
      .setDisplaySize(UI_BANNER_SIZE.width, UI_BANNER_SIZE.height)
      .setVisible(false)
      .setDepth(1000);

    // Farm girl congratulatory message elements
    const farmGirlY = CANVAS_HEIGHT / 2 - FARM_GIRL_SIZE.height / 4;
    this.farmGirlSprite = this.add.image(
      CANVAS_WIDTH / 2,
      farmGirlY,
      'char_farmgirl'
    )
      .setDisplaySize(FARM_GIRL_SIZE.width, FARM_GIRL_SIZE.height)
      .setVisible(false)
      .setDepth(1500);
    const congratsMsg =
      'Wow! Congratulations!\n' +
      'Keep going and farm more to earn more money!\n' +
      'Especially if you are called Georg or Allan!';
    this.farmGirlText = this.add.text(
      CANVAS_WIDTH / 2,
      farmGirlY + FARM_GIRL_SIZE.height / 2 + 10,
      congratsMsg,
      {
        font: '16px Arial',
        fill: '#ffffff',
        align: 'center',
        wordWrap: { width: CANVAS_WIDTH - 80 }
      }
    )
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setDepth(1500);

    // 3. “X” Clear-Selection Button
    let clearBtn = this.add.image(TILE_SIZE / 2, TILE_SIZE * 2, 'ui_clearcropselection')
                         .setDisplaySize(UI_CLEAR_BUTTON_SIZE.width, UI_CLEAR_BUTTON_SIZE.height)
                         .setInteractive()
                         .setDepth(1000);
    clearBtn.on('pointerdown', () => { this.clearSelection(); });

    // 4. Crop Icons + Stats
    let index = 0;
    for (let cropKey of Object.keys(CROP_DATA)) {
      let xIcon = TILE_SIZE / 2 - 8;
      let yIcon = TILE_SIZE * 3 + index * CROP_ICON_SPACING;
      let icon = this.add.image(xIcon, yIcon, 'crop_' + cropKey)
                         .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
                         .setInteractive()
                         .setDepth(1000);
      this.add.text(
        xIcon + TILE_SIZE/2 + 5,
        yIcon - CROP_TEXT_SIZE,
        "Cost: $" + CROP_DATA[cropKey].seedCost,
        { font: `${CROP_TEXT_SIZE}px Arial`, fill: "#ffffff" }
      ).setDepth(1000);
      this.add.text(
        xIcon + TILE_SIZE/2 + 5,
        yIcon,
        "Sell: $" + CROP_DATA[cropKey].harvestPrice,
        { font: `${CROP_TEXT_SIZE}px Arial`, fill: "#ffffff" }
      ).setDepth(1000);
      this.add.text(
        xIcon + TILE_SIZE/2 + 5,
        yIcon + CROP_TEXT_SIZE,
        "Time: " + CROP_DATA[cropKey].growthTime + "s",
        { font: `${CROP_TEXT_SIZE}px Arial`, fill: "#ffffff" }
      ).setDepth(1000);
      icon.on('pointerdown', () => { this.selectCrop(cropKey); });
      index++;
    }

    // 5. New Game Button
    let newGameBtn = this.add.image(
      SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE + RIGHT_SIDEBAR_WIDTH / 2,
      TILE_SIZE * 9,
      'ui_newgame'
    )
      .setDisplaySize(UI_NEWGAME_BUTTON_SIZE.width * 2, UI_NEWGAME_BUTTON_SIZE.height * 2)
      .setInteractive()
      .setDepth(1000);
    newGameBtn.on('pointerdown', () => { this.resetGame(); });

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

    // Version display
    this.add.text(
      CANVAS_WIDTH - 4,
      CANVAS_HEIGHT - 4,
      VERSION,
      { font: '12px Arial', fill: '#ffffff' }
    )
      .setOrigin(1,1)
      .setDepth(2000);

    // Load saved game state before timers
    this.loadGame();

    if (data && data.showIntro) {
      this.startIntroSequence();
    }

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

  getParcelIndex(row, col) {
    const r = Math.floor(row / PARCEL_SIZE);
    const c = Math.floor(col / PARCEL_SIZE);
    return r * 3 + c;
  }

  getParcelCenter(index) {
    const r = Math.floor(index / 3);
    const c = index % 3;
    const row = r * PARCEL_SIZE + 2;
    const col = c * PARCEL_SIZE + 2;
    return {
      x: SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2
    };
  }

  attemptPlantOrHarvest(row, col) {
    if (!this.parcelsUnlocked[this.getParcelIndex(row, col)]) {
      return;
    }
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
                          .setDisplaySize(
                            CROP_SPRITE_SIZE.width * 0.1,
                            CROP_SPRITE_SIZE.height * 0.1
                          );
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
    if (this.plantSprites[row][col].bounceTween) {
      this.plantSprites[row][col].bounceTween.stop();
      this.plantSprites[row][col].bounceTween = null;
    }
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
      UI_BANNER_SIZE.height / 2
    );
    if (this.bannerTimer) {
      this.bannerTimer.remove();
    }
    this.bannerTimer = this.time.delayedCall(BANNER_DURATION, () => {
      this.bannerImage.setVisible(false);
      this.bannerVisible = false;
    });
  }

  showFarmGirlMessage() {
    this.farmGirlSprite.setVisible(true);
    this.farmGirlText.setVisible(true);
    if (this.farmGirlTimer) {
      this.farmGirlTimer.remove();
    }
    this.farmGirlTimer = this.time.delayedCall(5000, () => {
      this.farmGirlSprite.setVisible(false);
      this.farmGirlText.setVisible(false);
    });
  }

  startIntroSequence() {
    const rightX = CANVAS_WIDTH - FARM_GIRL_SIZE.width / 2 - 10;
    const leftX  = FARM_GIRL_SIZE.width / 2 + 10;
    const yPos   = CANVAS_HEIGHT / 2 - FARM_GIRL_SIZE.height / 4;

    this.introGirl = this.add.image(rightX, yPos, 'char_farmgirl_dissatisfied')
      .setDisplaySize(FARM_GIRL_SIZE.width, FARM_GIRL_SIZE.height)
      .setAlpha(0)
      .setDepth(2000);
    const girlText = "Hmpf! You're too poor for me. You better work hard if you want me to come back!";
    this.introGirlText = this.add.text(rightX, yPos + FARM_GIRL_SIZE.height / 2 + 10, girlText, {
      font: '16px Arial',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: CANVAS_WIDTH - 80 }
    })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setDepth(2000);

    this.introOldMan = this.add.image(leftX, yPos, 'char_oldman')
      .setDisplaySize(FARM_GIRL_SIZE.width, FARM_GIRL_SIZE.height)
      .setAlpha(0)
      .setDepth(2000);
    const oldManStr = "Oh oh oh... Young People sure have spirit don't they. You better work hard if you don't want to end up old and lone like me young one.";
    this.introOldManText = this.add.text(leftX, yPos + FARM_GIRL_SIZE.height / 2 + 10, oldManStr, {
      font: '16px Arial',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: CANVAS_WIDTH - 80 }
    })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setDepth(2000);

    this.tweens.add({
      targets: [this.introGirl, this.introGirlText],
      alpha: 1,
      duration: INTRO_FADE_DURATION,
      onComplete: () => {
        this.time.delayedCall(INTRO_DISPLAY_TIME, () => {
          this.tweens.add({
            targets: [this.introGirl, this.introGirlText],
            alpha: 0,
            duration: INTRO_FADE_DURATION,
            onComplete: () => {
              this.time.delayedCall(1000, () => {
                this.tweens.add({
                  targets: [this.introOldMan, this.introOldManText],
                  alpha: 1,
                  duration: INTRO_FADE_DURATION,
                  onComplete: () => {
                    this.time.delayedCall(INTRO_DISPLAY_TIME, () => {
                      this.tweens.add({
                        targets: [this.introOldMan, this.introOldManText],
                        alpha: 0,
                        duration: INTRO_FADE_DURATION
                      });
                    });
                  }
                });
              });
            }
          });
        });
      }
    });
  }

  updateMoneyText() {
    this.moneyText.setText("$" + this.money);
    if (!this.farmGirlShown && this.money >= 1000) {
      this.farmGirlShown = true;
      localStorage.setItem('farmGirlShown', 'true');
      this.showFarmGirlMessage();
    }
  }

  saveGame() {
    const saveData = {
      money: this.money,
      parcelsUnlocked: this.parcelsUnlocked,
      unlockedCount: this.unlockedCount,
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
      this.parcelsUnlocked = saved.parcelsUnlocked || this.parcelsUnlocked;
      this.unlockedCount = saved.unlockedCount || this.unlockedCount;
      this.updateMoneyText();
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          let cell = saved.gridState[row][col];
          if (cell !== null) {
            let elapsed = (Date.now() - cell.plantedAt) / 1000;
            let progress = Phaser.Math.Clamp(elapsed / cell.growthTime, 0, 1);
            let x = SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
            let y = row * TILE_SIZE + TILE_SIZE/2;
            let sprite = this.add.image(x, y, 'crop_' + cell.cropType);
            if (progress >= 1) {
              sprite.setDisplaySize(
                CROP_SPRITE_SIZE.width,
                CROP_SPRITE_SIZE.height
              );
              sprite.bounceTween = this.tweens.add({
                targets: sprite,
                y: sprite.y - BOUNCE_PIXELS,
                scaleX: 1 + BOUNCE_SCALE,
                scaleY: 1 + BOUNCE_SCALE,
                duration: BOUNCE_DURATION,
                yoyo: true,
                repeat: -1
              });
            } else {
              let scale = 0.1 + 0.9 * progress;
              sprite.setDisplaySize(
                CROP_SPRITE_SIZE.width * scale,
                CROP_SPRITE_SIZE.height * scale
              );
            }
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
    this.updateParcelVisuals();
  }

  resetGame() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.plantSprites[row][col]) {
          if (this.plantSprites[row][col].bounceTween) {
            this.plantSprites[row][col].bounceTween.stop();
            this.plantSprites[row][col].bounceTween = null;
          }
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
    if (this.bannerVisible) {
      this.bannerImage.setVisible(false);
      this.bannerVisible = false;
      if (this.bannerTimer) {
        this.bannerTimer.remove();
        this.bannerTimer = null;
      }
    }
    if (this.farmGirlTimer) {
      this.farmGirlTimer.remove();
      this.farmGirlTimer = null;
    }
    this.farmGirlSprite.setVisible(false);
    this.farmGirlText.setVisible(false);

    this.parcelsUnlocked = Array(9).fill(false);
    this.parcelsUnlocked[4] = true;
    this.unlockedCount = 1;
    this.updateParcelVisuals();
  }

  updateParcelVisuals() {
    for (let i = 0; i < 9; i++) {
      const unlocked = this.parcelsUnlocked[i];
      const startRow = Math.floor(i / 3) * PARCEL_SIZE;
      const startCol = (i % 3) * PARCEL_SIZE;
      for (let r = 0; r < PARCEL_SIZE; r++) {
        for (let c = 0; c < PARCEL_SIZE; c++) {
          const row = startRow + r;
          const col = startCol + c;
          if (unlocked) {
            if (this.lockTints[row][col].visible) {
              this.tweens.add({
                targets: [this.lockTints[row][col]],
                alpha: 0,
                duration: 200,
                onComplete: () => {
                  this.lockTints[row][col].setVisible(false).setAlpha(0.6);
                }
              });
            }
          } else {
            this.lockTints[row][col].setVisible(true).setAlpha(0.6);
          }
        }
      }

      if (this.unlockButtons[i]) {
        this.unlockButtons[i].destroy();
        this.unlockButtons[i] = null;
      }

      if (!unlocked && this.isParcelEligible(i)) {
        const center = this.getParcelCenter(i);
        const btn = this.add.image(center.x, center.y, 'ui_unlock')
          .setDisplaySize(
            UI_UNLOCK_BUTTON_SIZE.width * 2,
            UI_UNLOCK_BUTTON_SIZE.height * 2
          )
          .setInteractive()
          .setDepth(1000);
        btn.on('pointerover', () => {
          const cost = UNLOCK_PRICES[this.unlockedCount - 1];
          this.unlockTooltip.setText(`Unlock Cost: $${cost} - Click to purchase`)
            .setPosition(center.x, center.y - 20)
            .setVisible(true);
        });
        btn.on('pointerout', () => {
          this.unlockTooltip.setVisible(false);
        });
        btn.on('pointerdown', () => {
          this.showUnlockConfirm(i);
        });
        this.unlockButtons[i] = btn;
      }
    }
  }

  isParcelEligible(index) {
    const r = Math.floor(index / 3);
    const c = index % 3;
    const neighbors = [];
    if (r > 0) neighbors.push((r - 1) * 3 + c);
    if (r < 2) neighbors.push((r + 1) * 3 + c);
    if (c > 0) neighbors.push(r * 3 + (c - 1));
    if (c < 2) neighbors.push(r * 3 + (c + 1));
    return neighbors.some(n => this.parcelsUnlocked[n]);
  }

  showUnlockConfirm(index) {
    const cost = UNLOCK_PRICES[this.unlockedCount - 1];
    const center = this.getParcelCenter(index);
    const bannerY = TILE_SIZE * 1.5;
    this.confirmText.setText(`Purchase Parcel ${index} for $${cost}?`);
    this.confirmContainer.setPosition(center.x, bannerY);
    this.confirmContainer.setVisible(true);
    this.confirmYes.removeAllListeners('pointerdown');
    this.confirmNo.removeAllListeners('pointerdown');
    this.confirmYes.on('pointerdown', () => {
      if (this.money >= cost) {
        this.money -= cost;
        this.updateMoneyText();
        this.parcelsUnlocked[index] = true;
        this.unlockedCount++;
        this.confirmContainer.setVisible(false);
        this.saveGame();
        this.updateParcelVisuals();
      } else {
        this.showBanner();
        this.confirmContainer.setVisible(false);
      }
    });
    this.confirmNo.on('pointerdown', () => {
      this.confirmContainer.setVisible(false);
    });
  }

  updateGrowth() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let cell = this.gridState[row][col];
        if (cell !== null) {
          let elapsed = (Date.now() - cell.plantedAt) / 1000;
          let progress = Phaser.Math.Clamp(elapsed / cell.growthTime, 0, 1);
          let sprite = this.plantSprites[row][col];
          if (progress >= 1) {
            if (!sprite.bounceTween) {
              sprite.setDisplaySize(
                CROP_SPRITE_SIZE.width,
                CROP_SPRITE_SIZE.height
              );
              sprite.bounceTween = this.tweens.add({
                targets: sprite,
                y: sprite.y - BOUNCE_PIXELS,
                scaleX: 1 + BOUNCE_SCALE,
                scaleY: 1 + BOUNCE_SCALE,
                duration: BOUNCE_DURATION,
                yoyo: true,
                repeat: -1
              });
            }
          } else {
            let scale = 0.1 + 0.9 * progress;
            sprite.setDisplaySize(
              CROP_SPRITE_SIZE.width * scale,
              CROP_SPRITE_SIZE.height * scale
            );
          }
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
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  },
  scene: [Boot, Title, Farm]
};
new Phaser.Game(config);
