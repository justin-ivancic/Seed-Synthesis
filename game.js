const CROP_DATA = {
  carrot:     { seedCost: 5,   harvestPrice: 9,   growthTime: 8   },
  wheat:      { seedCost: 7,   harvestPrice: 13,  growthTime: 12  },
  corn:       { seedCost: 10,  harvestPrice: 18,  growthTime: 20  },
  flower:     { seedCost: 20,  harvestPrice: 36,  growthTime: 60  },
  tomato:     { seedCost: 40,  harvestPrice: 70,  growthTime: 180 },
  glowshroom: { seedCost: 100, harvestPrice: 180, growthTime: 600 }
};

const CROP_ORDER = ['carrot', 'wheat', 'corn', 'flower', 'tomato', 'glowshroom'];

const CROP_UNLOCK_PRICES = {
  wheat: 500,
  corn: 1500,
  flower: 2000,
  tomato: 2500,
  glowshroom: 5000
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

let CANVAS_WIDTH            = window.innerWidth;
let CANVAS_HEIGHT           = window.innerHeight;

const INITIAL_MONEY   = 100;
const BANNER_DURATION = 2000; // milliseconds
const PARCEL_SIZE     = 5;
const UNLOCK_PRICES   = [
  1000, 5000, 10000, 25000, 100000, 200000, 300000, 1000000
];
const VERSION = "v.0.1.5";

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
    this.versionText = this.add.text(
      CANVAS_WIDTH - 4,
      CANVAS_HEIGHT - 4,
      VERSION,
      { font: '12px Arial', fill: '#ffffff' }
    )
      .setOrigin(1,1)
      .setDepth(10000);

    this.scale.on('resize', (gameSize) => {
      const { width, height } = gameSize;
      this.versionText.setPosition(width - 4, height - 4);
    });
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
    this.cropsUnlocked = {
      carrot: true,
      wheat: false,
      corn: false,
      flower: false,
      tomato: false,
      glowshroom: false
    };
    this.cropIcons = {};
    this.cropTexts = {};
    this.cropUnlockButtons = {};
    this.money         = INITIAL_MONEY;
    this.selectedCrop  = null;
    this.ghostSprite   = null;
    this.bannerVisible = false;
    this.bannerTimer   = null;
    this.farmGirlShown = localStorage.getItem('farmGirlShown') === 'true';
    this.farmGirlTimer = null;

    // compute offsets to roughly center the grid and sidebars
    this.offsetX = Math.max(0, Math.floor((CANVAS_WIDTH - (SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE + RIGHT_SIDEBAR_WIDTH)) / 2));
    this.offsetY = Math.max(0, Math.floor((CANVAS_HEIGHT - GRID_ROWS * TILE_SIZE) / 2));

    // b. Draw the 15×15 Grid Background and lock overlays
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        let x = this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2;
        let y = this.offsetY + row * TILE_SIZE + TILE_SIZE / 2;
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
    let moneyX = this.offsetX + SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2 - TILE_SIZE;
  this.add.image(moneyX, this.offsetY + TILE_SIZE / 2, 'ui_money')
    .setDisplaySize(UI_MONEY_SIZE.width, UI_MONEY_SIZE.height)
    .setDepth(1000);
  this.moneyText = this.add.text(
    moneyX + TILE_SIZE / 2 + 4, this.offsetY + TILE_SIZE / 2,
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
      this.offsetX + SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE) / 2,
      this.offsetY + UI_BANNER_SIZE.height / 2,
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
    let clearBtn = this.add.image(this.offsetX + TILE_SIZE / 2, this.offsetY + TILE_SIZE * 2, 'ui_clearcropselection')
                         .setDisplaySize(UI_CLEAR_BUTTON_SIZE.width, UI_CLEAR_BUTTON_SIZE.height)
                         .setInteractive()
                         .setDepth(1000);
    clearBtn.on('pointerdown', () => { this.clearSelection(); });

    // 4. Crop Icons + Stats
    let index = 0;
    for (let cropKey of CROP_ORDER) {
      let xIcon = this.offsetX + TILE_SIZE / 2 - 8;
      let yIcon = this.offsetY + TILE_SIZE * 3 + index * CROP_ICON_SPACING;
      let icon = this.add.image(xIcon, yIcon, 'crop_' + cropKey)
                         .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
                         .setDepth(1000);
      let costText = this.add.text(
        xIcon + TILE_SIZE/2 + 5,
        yIcon - CROP_TEXT_SIZE,
        "Cost: $" + CROP_DATA[cropKey].seedCost,
        { font: `${CROP_TEXT_SIZE}px Arial`, fill: "#ffffff" }
      ).setDepth(1000);
      let sellText = this.add.text(
        xIcon + TILE_SIZE/2 + 5,
        yIcon,
        "Sell: $" + CROP_DATA[cropKey].harvestPrice,
        { font: `${CROP_TEXT_SIZE}px Arial`, fill: "#ffffff" }
      ).setDepth(1000);
      let timeText = this.add.text(
        xIcon + TILE_SIZE/2 + 5,
        yIcon + CROP_TEXT_SIZE,
        "Time: " + CROP_DATA[cropKey].growthTime + "s",
        { font: `${CROP_TEXT_SIZE}px Arial`, fill: "#ffffff" }
      ).setDepth(1000);
      icon.on('pointerdown', () => { this.selectCrop(cropKey); });
      this.cropIcons[cropKey] = icon;
      this.cropTexts[cropKey] = [costText, sellText, timeText];
      index++;
    }

    this.updateCropVisuals();

    // 5. New Game Button
    let newGameBtn = this.add.image(
      this.offsetX + SIDEBAR_WIDTH + GRID_COLS * TILE_SIZE + RIGHT_SIDEBAR_WIDTH / 2,
      this.offsetY + TILE_SIZE * 9,
      'ui_newgame'
    )
      .setDisplaySize(UI_NEWGAME_BUTTON_SIZE.width * 2, UI_NEWGAME_BUTTON_SIZE.height * 2)
      .setInteractive()
      .setDepth(1000);
    newGameBtn.on('pointerdown', () => { this.resetGame(); });

    // e. Planting & Harvesting - pointer listener
    this.input.on('pointerdown', pointer => {
      let worldX = pointer.x - this.offsetX - SIDEBAR_WIDTH;
      let worldY = pointer.y - this.offsetY;
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
    this.versionText = this.add.text(
      CANVAS_WIDTH - 4,
      CANVAS_HEIGHT - 4,
      VERSION,
      { font: '12px Arial', fill: '#ffffff' }
    )
      .setOrigin(1,1)
      .setDepth(10000);

    this.scale.on('resize', (gameSize) => {
      const { width, height } = gameSize;
      this.versionText.setPosition(width - 4, height - 4);
    });

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
      let worldX = pointer.x - this.offsetX - SIDEBAR_WIDTH;
      let worldY = pointer.y - this.offsetY;
      let col = Math.floor(worldX / TILE_SIZE);
      let row = Math.floor(worldY / TILE_SIZE);
      if (
        row >= 0 && row < GRID_ROWS &&
        col >= 0 && col < GRID_COLS &&
        this.gridState[row][col] === null
      ) {
        this.ghostSprite.setVisible(true);
        this.ghostSprite.setPosition(
          this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2,
          this.offsetY + row * TILE_SIZE + TILE_SIZE/2
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
      x: this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE / 2,
      y: this.offsetY + row * TILE_SIZE + TILE_SIZE / 2
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
      if (!this.cropsUnlocked[cropType]) {
        return;
      }
      let cost = CROP_DATA[cropType].seedCost;
      if (this.money < cost) {
        this.showBanner();
        return;
      }
      // Deduct cost, update money
      this.money -= cost;
      this.updateMoneyText();

      // Animate planting by scaling a temporary ghost into the ground
      let x = this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
      let y = this.offsetY + row * TILE_SIZE + TILE_SIZE/2;
      const plantGhost = this.add.image(x, y, 'crop_' + cropType)
        .setDisplaySize(CROP_SPRITE_SIZE.width, CROP_SPRITE_SIZE.height)
        .setAlpha(0.5)
        .setDepth(999);
      this.tweens.add({
        targets: plantGhost,
        scaleX: 0,
        scaleY: 0,
        duration: 150,
        onComplete: () => plantGhost.destroy()
      });

      // Place new seedling sprite at 10% scale (but force 32×32 first)
      x = this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
      y = this.offsetY + row * TILE_SIZE + TILE_SIZE/2;
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
    const x = this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
    const y = this.offsetY + row * TILE_SIZE + TILE_SIZE/2;

    // Spawn small crop sprites that fly up and fade out
    for (let i = 0; i < 5; i++) {
      const piece = this.add.image(x, y, 'crop_' + cropType)
        .setDisplaySize(10, 10)
        .setDepth(1200);
      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-120, -60));
      const dist = Phaser.Math.Between(10, 20);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      this.tweens.add({
        targets: piece,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        duration: 400,
        onComplete: () => piece.destroy()
      });
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
      this.offsetX + SIDEBAR_WIDTH + (GRID_COLS * TILE_SIZE)/2,
      this.offsetY + UI_BANNER_SIZE.height / 2
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
    this.introOverlay = this.add.rectangle(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      0x000000,
      0.6
    )
      .setAlpha(0)
      .setDepth(1900);
    this.tweens.add({ targets: this.introOverlay, alpha: 0.6, duration: INTRO_FADE_DURATION });

    const rightX = CANVAS_WIDTH * 0.65;
    const leftX  = CANVAS_WIDTH * 0.35;
    const yPos   = CANVAS_HEIGHT / 2 - FARM_GIRL_SIZE.height / 4;

    this.introGirl = this.add.image(rightX, yPos, 'char_farmgirl_dissatisfied')
      .setDisplaySize(FARM_GIRL_SIZE.width, FARM_GIRL_SIZE.height)
      .setAlpha(0)
      .setDepth(2000);
    const girlText = "Hmpf! You're too poor for me.\nYou better work hard if you want me to come back!";
    this.introGirlText = this.add.text(rightX, yPos + FARM_GIRL_SIZE.height / 2 + 10, girlText, {
      font: '16px Arial',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: CANVAS_WIDTH / 2 - 40 }
    })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setDepth(2000);

    this.introOldMan = this.add.image(leftX, yPos, 'char_oldman')
      .setDisplaySize(FARM_GIRL_SIZE.width, FARM_GIRL_SIZE.height)
      .setAlpha(0)
      .setDepth(2000);
    const oldManStr = "Oh oh oh... Young People sure have spirit don't they.\nYou better work hard if you don't want to end up old and lonely like me, young one.";
    this.introOldManText = this.add.text(leftX, yPos + FARM_GIRL_SIZE.height / 2 + 10, oldManStr, {
      font: '16px Arial',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: CANVAS_WIDTH / 2 - 40 }
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
                        duration: INTRO_FADE_DURATION,
                        onComplete: () => {
                          this.tweens.add({
                            targets: this.introOverlay,
                            alpha: 0,
                            duration: INTRO_FADE_DURATION,
                            onComplete: () => { this.introOverlay.destroy(); }
                          });
                        }
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
      cropsUnlocked: this.cropsUnlocked,
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
      this.cropsUnlocked = saved.cropsUnlocked || this.cropsUnlocked;
      this.updateMoneyText();
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          let cell = saved.gridState[row][col];
          if (cell !== null) {
            let elapsed = (Date.now() - cell.plantedAt) / 1000;
            let progress = Phaser.Math.Clamp(elapsed / cell.growthTime, 0, 1);
            let x = this.offsetX + SIDEBAR_WIDTH + col * TILE_SIZE + TILE_SIZE/2;
            let y = this.offsetY + row * TILE_SIZE + TILE_SIZE/2;
            let sprite = this.add.image(x, y, 'crop_' + cell.cropType);
            if (progress >= 1) {
              sprite.setDisplaySize(
                CROP_SPRITE_SIZE.width,
                CROP_SPRITE_SIZE.height
              );
              sprite.baseScaleX = sprite.scaleX;
              sprite.baseScaleY = sprite.scaleY;
              sprite.bounceTween = this.tweens.add({
                targets: sprite,
                y: sprite.y - BOUNCE_PIXELS,
                scaleX: sprite.baseScaleX * (1 + BOUNCE_SCALE),
                scaleY: sprite.baseScaleY * (1 + BOUNCE_SCALE),
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
    this.updateCropVisuals();
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
    this.cropsUnlocked = {
      carrot: true,
      wheat: false,
      corn: false,
      flower: false,
      tomato: false,
      glowshroom: false
    };
    this.updateCropVisuals();
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
    const bannerY = this.offsetY + TILE_SIZE * 1.5;
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

  updateCropVisuals() {
    for (let cropKey of CROP_ORDER) {
      const unlocked = this.cropsUnlocked[cropKey];
      const icon = this.cropIcons[cropKey];
      const texts = this.cropTexts[cropKey];

      if (unlocked) {
        icon.clearTint();
        icon.setInteractive();
        texts.forEach(t => t.setTint(0xffffff));
        if (this.cropUnlockButtons[cropKey]) {
          this.cropUnlockButtons[cropKey].destroy();
          this.cropUnlockButtons[cropKey] = null;
        }
      } else {
        icon.setTint(0x555555);
        icon.disableInteractive();
        texts.forEach(t => t.setTint(0x555555));
        if (!this.cropUnlockButtons[cropKey]) {
          const btn = this.add.image(icon.x, icon.y, 'ui_unlock')
            .setDisplaySize(UI_UNLOCK_BUTTON_SIZE.width * 2, UI_UNLOCK_BUTTON_SIZE.height * 2)
            .setInteractive()
            .setDepth(1001);
          btn.on('pointerover', () => {
            const cost = CROP_UNLOCK_PRICES[cropKey];
            this.unlockTooltip.setText(`Unlock Cost: $${cost} - Click to purchase`)
              .setPosition(icon.x, icon.y - 20)
              .setVisible(true);
          });
          btn.on('pointerout', () => {
            this.unlockTooltip.setVisible(false);
          });
          btn.on('pointerdown', () => {
            this.showCropUnlockConfirm(cropKey);
          });
          this.cropUnlockButtons[cropKey] = btn;
        }
      }
    }
  }

  showCropUnlockConfirm(cropKey) {
    const cost = CROP_UNLOCK_PRICES[cropKey];
    const bannerY = this.offsetY + TILE_SIZE * 1.5;
    this.confirmText.setText(`Unlock ${cropKey.charAt(0).toUpperCase() + cropKey.slice(1)} for $${cost}?`);
    this.confirmContainer.setPosition(CANVAS_WIDTH / 2, bannerY);
    this.confirmContainer.setVisible(true);
    this.confirmYes.removeAllListeners('pointerdown');
    this.confirmNo.removeAllListeners('pointerdown');
    this.confirmYes.on('pointerdown', () => {
      if (this.money >= cost) {
        this.money -= cost;
        this.updateMoneyText();
        this.cropsUnlocked[cropKey] = true;
        this.confirmContainer.setVisible(false);
        this.saveGame();
        this.updateCropVisuals();
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
              sprite.baseScaleX = sprite.scaleX;
              sprite.baseScaleY = sprite.scaleY;
              sprite.bounceTween = this.tweens.add({
                targets: sprite,
                y: sprite.y - BOUNCE_PIXELS,
                scaleX: sprite.baseScaleX * (1 + BOUNCE_SCALE),
                scaleY: sprite.baseScaleY * (1 + BOUNCE_SCALE),
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
    mode: Phaser.Scale.RESIZE,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  },
  scene: [Boot, Title, Farm]
};
const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  CANVAS_WIDTH = window.innerWidth;
  CANVAS_HEIGHT = window.innerHeight;
  game.scale.resize(CANVAS_WIDTH, CANVAS_HEIGHT);
});
