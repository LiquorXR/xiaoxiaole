const BOARD_SIZE = 8;
const TILE_TYPES = ['🍎', '🍇', '🍊', '🍋', '🥝', '🫐'];
const SCORE_PER_TILE = 10;

let board = []; // Stores the type of each tile
let tileElements = []; // Stores the DOM elements
let score = 0;
let moves = 30;
let target = 1000;
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

function initGame() {
    score = 0;
    moves = 30;
    level = 1;
    target = 1000;
    updateUI();
    overlay.classList.add('hidden');
    createBoard();
}

function getTilePos(index) {
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
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
    
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        let randomTile;
        do {
            randomTile = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
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
    const x = selectedTile % BOARD_SIZE;
    const y = Math.floor(selectedTile / BOARD_SIZE);

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && x < BOARD_SIZE - 1) targetIndex = selectedTile + 1;
            else if (deltaX < 0 && x > 0) targetIndex = selectedTile - 1;
        }
    } else {
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && y < BOARD_SIZE - 1) targetIndex = selectedTile + BOARD_SIZE;
            else if (deltaY < 0 && y > 0) targetIndex = selectedTile - BOARD_SIZE;
        }
    }

    if (targetIndex !== -1) {
        swapTiles(selectedTile, targetIndex);
        selectedTile = null;
    }
    // If no swipe, keep selected for next click or wait for another swipe
}

function isInitialMatch(index, type) {
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    if (x >= 2 && board[index - 1] === type && board[index - 2] === type) return true;
    if (y >= 2 && board[index - BOARD_SIZE] === type && board[index - 2 * BOARD_SIZE] === type) return true;
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
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE - 2; x++) {
            const idx = y * BOARD_SIZE + x;
            const type = board[idx];
            if (type && board[idx+1] === type && board[idx+2] === type) {
                matchedIndices.add(idx); matchedIndices.add(idx+1); matchedIndices.add(idx+2);
            }
        }
    }
    // Vertical
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE - 2; y++) {
            const idx = y * BOARD_SIZE + x;
            const type = board[idx];
            if (type && board[idx+BOARD_SIZE] === type && board[idx+2*BOARD_SIZE] === type) {
                matchedIndices.add(idx); matchedIndices.add(idx+BOARD_SIZE); matchedIndices.add(idx+2*BOARD_SIZE);
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
    for (let x = 0; x < BOARD_SIZE; x++) {
        let emptySpot = -1;
        for (let y = BOARD_SIZE - 1; y >= 0; y--) {
            const idx = y * BOARD_SIZE + x;
            if (board[idx] === null) {
                if (emptySpot === -1) emptySpot = y;
            } else if (emptySpot !== -1) {
                board[emptySpot * BOARD_SIZE + x] = board[idx];
                tileElements[emptySpot * BOARD_SIZE + x] = tileElements[idx];
                board[idx] = null;
                tileElements[idx] = null;
                emptySpot--;
            }
        }
    }
}

function refillBoard() {
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        if (board[i] === null) {
            const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
            board[i] = type;
            
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            tileElement.dataset.index = i; // 修复：补充缺失的 index
            tileElement.innerText = type;
            
            // Start from above the board for falling effect
            const x = i % BOARD_SIZE;
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
        level++;
        target += 1000;
        moves += 15;
        updateUI();
        // Show level up message
        document.getElementById('overlay-title').innerText = `下一关: 第 ${level} 关`;
        document.getElementById('overlay-score').innerText = `目标得分: ${target}`;
        overlay.classList.remove('hidden');
        await sleep(2000);
        overlay.classList.add('hidden');
    } else if (moves <= 0) {
        endGame('步数用光了');
    }
}

function endGame(message) {
    document.getElementById('overlay-title').innerText = message;
    document.getElementById('overlay-score').innerText = `最终得分: ${score}`;
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
