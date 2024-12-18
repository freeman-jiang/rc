// Run: `ts-node space-invaders.ts 2> debug.log`
// See logs in real-time: `tail -f debug.log`

import readline from "readline";
import fs from "fs";

// Enable reading terminal input without requiring Enter key
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

// -- DEBUG UTILITIES --
const LOG_FILE = "debug.log";
const dbg = (...args: any[]) => {
  console.error("[DEBUG]", ...args);
};
const clearLogFile = () => {
  fs.writeFileSync(LOG_FILE, "");
};

let count = 0;
const createId = () => {
  count += 1;
  return count;
};

enum BoardCharacter {
  BaseBoardBackground = " ",
  FullBoardBackground = "y",
  Player = "▲",
  Enemy = "■",
  Bullet = ".",
}

enum Direction {
  Left = "left",
  Right = "right",
}

const getCoordinate = ({ x, y }: { x: number; y: number }) => {
  return `(${x},${y})`;
};

const flipDirection = (direction: Direction) => {
  if (direction === Direction.Left) {
    return Direction.Right;
  }
  return Direction.Left;
};

class Enemy {
  x: number;
  y: number;
  character: string;
  id: number;

  constructor({ x, y }: { x: number; y: number }) {
    this.x = x;
    this.y = y;
    this.character = BoardCharacter.Enemy;
    this.id = createId();
  }
}

class Bullet {
  x: number;
  y: number;
  character: string;
  id: number;

  constructor({ x, y }: { x: number; y: number }) {
    this.x = x;
    this.y = y;
    this.character = BoardCharacter.Bullet;
    this.id = createId();
  }
}

class SpaceInvaders {
  player: { x: number; y: number };
  width: number;
  height: number;
  isGameRunning: boolean;
  enemies: Enemy[];
  enemyDirection: Direction;
  bullets: Bullet[];

  constructor() {
    this.width = 40;
    this.height = 20;

    // Place player at bottom center
    this.player = {
      x: Math.floor(this.width / 2),
      y: this.height - 1,
    };

    this.isGameRunning = true;
    this.enemyDirection = Direction.Right;
    this.enemies = this.createEnemies();
    this.bullets = [];
  }

  createBullet() {
    const bullet = new Bullet({ x: this.player.x, y: this.player.y - 1 });
    this.bullets.push(bullet);
  }

  setupInputHandling() {
    process.stdin.on("keypress", (str, key) => {
      if (key.name === "left" && this.player.x > 0) {
        this.player.x -= 1;
      } else if (key.name === "right" && this.player.x < this.width - 1) {
        this.player.x += 1;
      } else if (key.name === "q" || (key.ctrl && key.name === "c")) {
        this.gameOver("Thanks for playing!");
      } else if (key.name === "space") {
        this.createBullet();
      }

      // Immediately render after any input
      this.render();
    });
  }

  createEnemies(): Enemy[] {
    const NUM_ENEMIES_PER_ROW = 8;
    const NUM_ROWS = 3;
    const ENEMY_X_SPACING = 3;
    const ENEMY_Y_SPACING = 2;
    const ENEMY_X_START = 3;
    const ENEMY_Y_START = 1;

    const enemies: Enemy[] = [];

    for (let row = 0; row < NUM_ROWS; row++) {
      for (let col = 0; col < NUM_ENEMIES_PER_ROW; col++) {
        enemies.push(
          new Enemy({
            x: ENEMY_X_START + col * ENEMY_X_SPACING,
            y: ENEMY_Y_START + row * ENEMY_Y_SPACING,
          })
        );
      }
    }
    return enemies;
  }

  moveBullets() {
    for (const bullet of this.bullets) {
      bullet.y -= 1;
    }

    const bulletCoordinates = new Set(
      this.bullets.map((b) => getCoordinate(b))
    );

    this.enemies = this.enemies.filter(
      (e) => !bulletCoordinates.has(getCoordinate(e))
    );

    this.bullets = this.bullets.filter((b) => b.y >= 0);
  }

  moveEnemies() {
    const directionVector = this.enemyDirection === Direction.Right ? 1 : -1;

    // Find leftmost and rightmost enemy positions
    const leftmost = Math.min(...this.enemies.map((e) => e.x));
    const rightmost = Math.max(...this.enemies.map((e) => e.x));

    // Check if group will hit edge and flip direction if needed
    if (
      rightmost + directionVector >= this.width - 1 ||
      leftmost + directionVector <= 0
    ) {
      this.enemyDirection = flipDirection(this.enemyDirection);
    }

    // Move all enemies
    this.enemies.forEach((enemy) => {
      enemy.x += 1 * directionVector;
    });
  }

  createBaseBoard(): string[][] {
    const board = Array(this.height)
      .fill("")
      .map(() => Array(this.width).fill(BoardCharacter.BaseBoardBackground));

    return board;
  }

  // Creates a board with borders around the base board
  createFullBoard(board: string[][]) {
    const width = this.width + 2;
    const height = this.height + 2;

    const fullBoard = Array(height)
      .fill("")
      .map(() => Array(width).fill(BoardCharacter.FullBoardBackground));

    // Draw borders
    for (let i = 0; i < height; i++) {
      fullBoard[i][0] = "│";
      fullBoard[i][width - 1] = "│";
    }
    for (let i = 0; i < width; i++) {
      fullBoard[0][i] = "─";
      fullBoard[height - 1][i] = "─";
    }

    // Draw corners
    fullBoard[0][0] = "┌";
    fullBoard[0][width - 1] = "┐";
    fullBoard[height - 1][0] = "└";
    fullBoard[height - 1][width - 1] = "┘";

    // Draw the base board on top of the full board
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        fullBoard[i + 1][j + 1] = board[i][j];
      }
    }

    return fullBoard;
  }

  render() {
    console.clear();

    const baseBoard = this.createBaseBoard();

    // Draw enemies
    this.renderEnemies(baseBoard);
    this.renderBullets(baseBoard);

    // Draw player (as a triangle)
    baseBoard[this.player.y][this.player.x] = BoardCharacter.Player;
    dbg(this.player);

    // Add borders around the base board
    const fullBoard = this.createFullBoard(baseBoard);

    // Print the board
    console.log(fullBoard.map((row) => row.join("")).join("\n"));

    // Print controls
    console.log("\nControls: ←/→ to move, Q to quit");
  }

  renderBullets(baseBoard: string[][]) {
    this.bullets.forEach((bullet) => {
      baseBoard[bullet.y][bullet.x] = bullet.character;
    });
  }

  renderEnemies(baseBoard: string[][]) {
    this.enemies.forEach((enemy) => {
      baseBoard[enemy.y][enemy.x] = enemy.character;
    });
  }

  gameOver(message: string) {
    this.isGameRunning = false;
    console.clear();
    console.log(message);
    process.exit(0);
  }

  start() {
    // Clear the old log file
    clearLogFile();

    this.setupInputHandling();

    const gameLoop = setInterval(() => {
      if (!this.isGameRunning) {
        clearInterval(gameLoop);
        return;
      }

      this.moveEnemies();
      this.moveBullets();
      this.render();
    }, 250);
  }
}

// Start the game
const game = new SpaceInvaders();
console.log("Starting game...");
game.start();
