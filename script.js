/**
 * 俄罗斯方块游戏逻辑
 */

// ===== 游戏常量 =====
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = {
    I: '#fcbebef5',
    O: '#f6dd62cf',
    T: '#b3b3f4',
    L: '#fec4b1c6',
    J: '#a7cef2de',
    S: '#8ef8d8e2',
    Z: '#FFE0F0'
};

const PIECES = {
    I: [
        [[1,1,1,1]],
        [[1],[1],[1],[1]]
    ],
    O: [[[1,1],[1,1]]],
    T: [
        [[0,1,0],[1,1,1]],
        [[1,0],[1,1],[1,0]],
        [[1,1,1],[0,1,0]],
        [[0,1],[1,1],[0,1]]
    ],
    L: [
        [[1,0],[1,0],[1,1]],
        [[1,1,1],[1,0,0]],
        [[1,1],[0,1],[0,1]],
        [[0,0,1],[1,1,1]]
    ],
    J: [
        [[0,1],[0,1],[1,1]],
        [[1,1,1],[0,0,1]],
        [[1,1],[1,0],[1,0]],
        [[1,0,0],[1,1,1]]
    ],
    S: [
        [[0,1,1],[1,1,0]],
        [[1,0],[1,1],[0,1]]
    ],
    Z: [
        [[1,1,0],[0,1,1]],
        [[0,1],[1,1],[1,0]]
    ]
};

// ===== 游戏状态 =====
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let isPaused = false;
let dropInterval = 1000;
let lastDropTime = 0;

// ===== 画布 =====
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// ===== 初始化 =====
function initBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

function createPiece() {
    const pieces = Object.keys(PIECES);
    const type = pieces[Math.floor(Math.random() * pieces.length)];
    return {
        type,
        shape: PIECES[type][0],
        rotation: 0,
        x: Math.floor(COLS / 2) - Math.floor(PIECES[type][0][0].length / 2),
        y: 0,
        color: COLORS[type]
    };
}

function rotatePiece(piece) {
    const pieces = PIECES[piece.type];
    const newRotation = (piece.rotation + 1) % pieces.length;
    return { ...piece, rotation: newRotation, shape: pieces[newRotation] };
}

// ===== 碰撞检测 =====
function checkCollision(piece, dx = 0, dy = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + dx;
                const newY = piece.y + y + dy;
                if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
}

// ===== 核心游戏逻辑 =====
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) board[boardY][boardX] = currentPiece.color;
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            addClearAnimation(y);
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 + (linesCleared === 4 ? 400 : 0);
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateDisplay();
    }
}

function addClearAnimation(row) {
    const anim = document.createElement('div');
    anim.className = 'clear-animation';
    anim.style.cssText = `width:100%;height:${BLOCK_SIZE}px;top:${row * BLOCK_SIZE + 12}px;left:12px;`;
    document.querySelector('.game-board').appendChild(anim);
    setTimeout(() => anim.remove(), 500);
}

function checkGameOver() {
    return board[0].some(cell => cell !== 0);
}

function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
    document.getElementById('level').textContent = level;
}

// ===== 绘制 =====
function drawBlock(context, x, y, color, size = BLOCK_SIZE) {
    context.fillStyle = color;
    context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
    context.fillStyle = 'rgba(255,255,255,0.3)';
    context.fillRect(x * size + 2, y * size + 2, size - 4, 4);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 网格
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, i * BLOCK_SIZE);
        ctx.stroke();
    }

    // 已固定方块
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) drawBlock(ctx, x, y, board[y][x]);
        }
    }
}

function drawPiece(piece) {
    if (!piece) return;
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) drawBlock(ctx, piece.x + x, piece.y + y, piece.color);
        }
    }
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    const size = 20;
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * size) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * size) / 2;
    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(offsetX + x * size, offsetY + y * size, size - 2, size - 2);
            }
        }
    }
}

// ===== 游戏循环 =====
function gameLoop(timestamp) {
    if (!gameRunning || isPaused) return;

    if (timestamp - lastDropTime > dropInterval) {
        if (!checkCollision(currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            lockPiece();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = createPiece();
            if (checkCollision(currentPiece)) {
                gameOver();
                return;
            }
        }
        lastDropTime = timestamp;
    }

    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

function startGame() {
    initBoard();
    currentPiece = createPiece();
    nextPiece = createPiece();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    gameRunning = true;
    isPaused = false;
    lastDropTime = 0;
    updateDisplay();
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseBtn').textContent = '暂停';
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    startGame();
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '继续' : '暂停';
    if (!isPaused) requestAnimationFrame(gameLoop);
}

// ===== 操作控制 =====
function moveLeft()  { if (gameRunning && !isPaused && !checkCollision(currentPiece, -1, 0)) currentPiece.x--; }
function moveRight() { if (gameRunning && !isPaused && !checkCollision(currentPiece, 1, 0))  currentPiece.x++; }
function moveDown()  {
    if (gameRunning && !isPaused && !checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score++;
        updateDisplay();
    }
}
function rotate() {
    if (!gameRunning || isPaused) return;
    const rotated = rotatePiece(currentPiece);
    if (!checkCollision(rotated)) currentPiece = rotated;
}
function hardDrop() {
    if (!gameRunning || isPaused) return;
    while (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    updateDisplay();
}

// ===== 键盘事件 =====
document.addEventListener('keydown', (e) => {
    // 防止方向键和空格键滚动页面
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowLeft':  moveLeft();  break;
        case 'ArrowRight': moveRight(); break;
        case 'ArrowDown':  moveDown();  break;
        case 'ArrowUp':    rotate();    break;
        case ' ':          hardDrop();  break;
    }
});

// 重新开始 / 暂停
document.getElementById('restartBtn')?.addEventListener('click', restartGame);
document.getElementById('pauseBtn')?.addEventListener('click', togglePause);

// 方向键事件绑定（桌面端 ctrl-btn + 移动端 mobile-ctrl-btn）
document.querySelectorAll('.ctrl-btn, .mobile-ctrl-btn').forEach(btn => {
    const action = btn.dataset.action;
    const map = { left: moveLeft, right: moveRight, down: moveDown, rotate, drop: hardDrop };
    if (map[action]) btn.addEventListener('click', map[action]);
});

// 防止移动端滚动
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.ctrl-btn, .mobile-ctrl-btn')) e.preventDefault();
}, { passive: false });

// ===== 启动 =====
startGame();