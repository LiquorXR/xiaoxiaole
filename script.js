const ROWS = 12;
const COLS = 8;
const ALL_TILE_TYPES = ['🍎', '🍇', '🍊', '🍋', '🥝', '🫐', '🍓', '🍑', '🍍'];
const SCORE_PER_TILE = 1;

let currentTileTypes = [];
let board = []; // Stores the type of each tile
let tileElements = []; // Stores the DOM elements
let score = 0;
let moves = 30;
let target = 100;
let level = 1;
let selectedTile = null;
let isProcessing = false;

// Touch handling
let touchStartX = 0;
let touchStartY = 0;

const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const movesDisplay = document.getElementById('moves');
const targetDisplay = document.getElementById('target');
const levelDisplay = document.getElementById('level');
const progressBar = document.getElementById('progress-bar');
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restart-btn');

function getLevelConfig(lvl) {
    // 难度随关卡增加：
    // 1. 方块种类增加：起始3种，每2关增加1种，最多9种
    const tileCount = Math.min(3 + Math.floor((lvl - 1) / 2), ALL_TILE_TYPES.length);
    
    // 2. 目标分数增加：基础100，每关增加 50 * level
    const targetScore = 100 + (lvl - 1) * 50 * lvl;
    
    // 3. 初始步数：基础30，随关卡略微减少，但最低不少于15步
    const initialMoves = Math.max(15, 30 - Math.floor((lvl - 1) / 2));

    return {
        tileTypes: ALL_TILE_TYPES.slice(0, tileCount),
        target: targetScore,
        moves: initialMoves
    };
}

function initGame() {
    level = 1;
    score = 0;
    startLevel(level);
}

function startLevel(lvl) {
    const config = getLevelConfig(lvl);
    currentTileTypes = config.tileTypes;
    target = config.target;
    moves = config.moves;
    score = 0; // 每关分数重置，挑战该关卡目标
    
    // 清除可能存在的下一关按钮
    const nextBtn = document.getElementById('next-level-btn');
    if (nextBtn) nextBtn.remove();
    
    // 恢复重新开始按钮显示
    restartBtn.classList.remove('hidden');
    
    updateUI();
    overlay.classList.add('hidden');
    createBoard();
}

function getTilePos(index) {
    const x = index % COLS;
    const y = Math.floor(index / COLS);
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
    const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
    
    return {
        left: `calc(${x} * var(--tile-size) + ${x + 1} * var(--gap))`,
        top: `calc(${y} * var(--tile-size) + ${y + 1} * var(--gap))`
    };
}

function createBoard() {
    gameBoard.innerHTML = '';
    board = [];
    tileElements = [];
    
    for (let i = 0; i < ROWS * COLS; i++) {
        let randomTile;
        do {
            randomTile = currentTileTypes[Math.floor(Math.random() * currentTileTypes.length)];
        } while (isInitialMatch(i, randomTile));
        
        board[i] = randomTile;
        const tileElement = document.createElement('div');
        tileElement.classList.add('tile');
        tileElement.dataset.index = i;
        tileElement.innerText = randomTile;
        
        const pos = getTilePos(i);
        tileElement.style.left = pos.left;
        tileElement.style.top = pos.top;

        tileElement.addEventListener('mousedown', (e) => handleStart(parseInt(e.currentTarget.dataset.index), e.clientX, e.clientY));
        tileElement.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            handleStart(parseInt(e.currentTarget.dataset.index), touch.clientX, touch.clientY);
        }, {passive: true});

        gameBoard.appendChild(tileElement);
        tileElements[i] = tileElement;
    }

    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
}

function handleStart(index, x, y) {
    if (isProcessing || moves <= 0 || isNaN(index)) return;
    touchStartX = x;
    touchStartY = y;
    
    if (selectedTile !== null && tileElements[selectedTile]) {
        tileElements[selectedTile].classList.remove('selected');
    }
    
    selectedTile = index;
    if (tileElements[index]) {
        tileElements[index].classList.add('selected');
    }
}

function handleEnd(e) {
    if (selectedTile === null || isNaN(selectedTile) || isProcessing) return;

    let endX, endY;
    if (e.type === 'touchend') {
        const touch = e.changedTouches[0];
        endX = touch.clientX;
        endY = touch.clientY;
    } else {
        endX = e.clientX;
        endY = e.clientY;
    }

    const deltaX = endX - touchStartX;
    const deltaY = endY - touchStartY;
    const minSwipeDistance = 30;

    let targetIndex = -1;
    const x = selectedTile % COLS;
    const y = Math.floor(selectedTile / COLS);

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && x < COLS - 1) targetIndex = selectedTile + 1;
            else if (deltaX < 0 && x > 0) targetIndex = selectedTile - 1;
        }
    } else {
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && y < ROWS - 1) targetIndex = selectedTile + COLS;
            else if (deltaY < 0 && y > 0) targetIndex = selectedTile - COLS;
        }
    }

    if (targetIndex !== -1) {
        swapTiles(selectedTile, targetIndex);
        selectedTile = null;
    }
    // If no swipe, keep selected for next click or wait for another swipe
}

function isInitialMatch(index, type) {
    const x = index % COLS;
    const y = Math.floor(index / COLS);
    if (x >= 2 && board[index - 1] === type && board[index - 2] === type) return true;
    if (y >= 2 && board[index - COLS] === type && board[index - 2 * COLS] === type) return true;
    return false;
}

async function swapTiles(idx1, idx2) {
    isProcessing = true;
    try {
        if (tileElements[idx1]) tileElements[idx1].classList.remove('selected');

    // Visual swap
    const tempType = board[idx1];
    board[idx1] = board[idx2];
    board[idx2] = tempType;

    // Swap elements in array for reference
    const tempElem = tileElements[idx1];
    tileElements[idx1] = tileElements[idx2];
    tileElements[idx2] = tempElem;

    renderBoardPositions();
    
    await sleep(300);

    const matches = checkMatches();
    if (matches.length > 0) {
        moves--;
        updateUI();
        await processMatches();
    } else {
        // Swap back
        board[idx2] = board[idx1];
        board[idx1] = tempType;
        tileElements[idx2] = tileElements[idx1];
        tileElements[idx1] = tempElem;
        renderBoardPositions();
        await sleep(300);
    }
    
    } catch (error) {
        console.error('Error in swapTiles:', error);
    } finally {
        isProcessing = false;
    }
    await checkGameOver();
}

function checkMatches() {
    let matchedIndices = new Set();
    // Horizontal
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS - 2; x++) {
            const idx = y * COLS + x;
            const type = board[idx];
            if (type && board[idx+1] === type && board[idx+2] === type) {
                matchedIndices.add(idx); matchedIndices.add(idx+1); matchedIndices.add(idx+2);
            }
        }
    }
    // Vertical
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS - 2; y++) {
            const idx = y * COLS + x;
            const type = board[idx];
            if (type && board[idx+COLS] === type && board[idx+2*COLS] === type) {
                matchedIndices.add(idx); matchedIndices.add(idx+COLS); matchedIndices.add(idx+2*COLS);
            }
        }
    }
    return Array.from(matchedIndices);
}

async function processMatches() {
    let matches = checkMatches();
    while (matches.length > 0) {
        // Animation
        matches.forEach(idx => {
            const el = tileElements[idx];
            el.classList.add('match');
            createParticles(idx);
        });
        await sleep(350);
        
        score += matches.length * SCORE_PER_TILE;
        updateUI();
        
        // Remove
        matches.forEach(idx => {
            tileElements[idx].remove();
            board[idx] = null;
            tileElements[idx] = null;
        });
        
        await sleep(100);
        
        // Drop
        dropTiles();
        renderBoardPositions();
        await sleep(300);
        
        // Refill
        refillBoard();
        await sleep(300);
        
        matches = checkMatches();
    }
}

function dropTiles() {
    for (let x = 0; x < COLS; x++) {
        let emptySpot = -1;
        for (let y = ROWS - 1; y >= 0; y--) {
            const idx = y * COLS + x;
            if (board[idx] === null) {
                if (emptySpot === -1) emptySpot = y;
            } else if (emptySpot !== -1) {
                board[emptySpot * COLS + x] = board[idx];
                tileElements[emptySpot * COLS + x] = tileElements[idx];
                board[idx] = null;
                tileElements[idx] = null;
                emptySpot--;
            }
        }
    }
}

function refillBoard() {
    for (let i = 0; i < ROWS * COLS; i++) {
        if (board[i] === null) {
            const type = currentTileTypes[Math.floor(Math.random() * currentTileTypes.length)];
            board[i] = type;
            
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            tileElement.dataset.index = i; // 修复：补充缺失的 index
            tileElement.innerText = type;
            
            // Start from above the board for falling effect
            const x = i % COLS;
            const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
            tileElement.style.left = getTilePos(i).left;
            tileElement.style.top = `-${size}px`;
            tileElement.style.opacity = '0';
            
            tileElement.addEventListener('mousedown', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                handleStart(idx, e.clientX, e.clientY);
            });
            tileElement.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const idx = parseInt(e.currentTarget.dataset.index);
                handleStart(idx, touch.clientX, touch.clientY);
            }, {passive: true});

            gameBoard.appendChild(tileElement);
            tileElements[i] = tileElement;
            
            // Trigger transition
            setTimeout(() => {
                tileElement.style.top = getTilePos(i).top;
                tileElement.style.opacity = '1';
            }, 10);
        }
    }
}

function renderBoardPositions() {
    tileElements.forEach((el, i) => {
        if (el) {
            const pos = getTilePos(i);
            el.style.left = pos.left;
            el.style.top = pos.top;
            el.dataset.index = i;
        }
    });
}

function updateUI() {
    scoreDisplay.innerText = score;
    movesDisplay.innerText = moves;
    targetDisplay.innerText = target;
    levelDisplay.innerText = level;
    const progress = Math.min((score / target) * 100, 100);
    progressBar.style.width = progress + '%';
}

async function checkGameOver() {
    if (score >= target) {
        // 过关逻辑
        document.getElementById('overlay-title').innerText = `恭喜过关！`;
        document.getElementById('overlay-score').innerText = `本关得分: ${score}`;
        
        if (!document.getElementById('next-level-btn')) {
            const nextBtn = document.createElement('button');
            nextBtn.id = 'next-level-btn';
            nextBtn.innerText = `进入第 ${level + 1} 关`;
            nextBtn.onclick = () => {
                level++;
                startLevel(level);
            };
            
            const messageBox = document.querySelector('.message');
            restartBtn.classList.add('hidden');
            messageBox.appendChild(nextBtn);
        }
        
        overlay.classList.remove('hidden');
    } else if (moves <= 0) {
        endGame('步数用光了');
    }
}

function endGame(message) {
    document.getElementById('overlay-title').innerText = message;
    document.getElementById('overlay-score').innerText = `最终得分: ${score}`;
    
    // 确保没有下一关按钮
    const nextBtn = document.getElementById('next-level-btn');
    if (nextBtn) nextBtn.remove();
    
    restartBtn.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function createParticles(index) {
    const pos = getTilePos(index);
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `calc(${pos.left} + var(--tile-size) / 2)`;
        particle.style.top = `calc(${pos.top} + var(--tile-size) / 2)`;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 50;
        const dx = Math.cos(angle) * velocity + 'px';
        const dy = Math.sin(angle) * velocity + 'px';
        
        particle.style.setProperty('--dx', dx);
        particle.style.setProperty('--dy', dy);
        
        gameBoard.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

restartBtn.addEventListener('click', initGame);
initGame();
