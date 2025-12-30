const ROWS = 10;
const COLS = 8;
const ALL_TILE_TYPES = ['🍎', '🍇', '🍊', '🍋', '🥝', '🫐', '🍓', '🍑', '🍍'];
const SUPER_TILE = '🌟'; // 超级方块标识
const SUPER_TILE_CHANCE = 0.05; // 5% 概率出现
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
let currentUser = null;
let userData = {
    level: 1,
    totalScore: 0,
    history: []
};

// UI Elements for Login and Ranking
const loginScreen = document.getElementById('login-screen');
const rankScreen = document.getElementById('rank-screen');
const authTitle = document.getElementById('auth-title');
const authTabLogin = document.getElementById('tab-login');
const authTabRegister = document.getElementById('tab-register');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
const confirmPasswordGroup = document.getElementById('confirm-password-group');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authMsg = document.getElementById('auth-msg');

const showRankBtn = document.getElementById('show-rank-btn');
const closeRankBtn = document.getElementById('close-rank-btn');
const rankList = document.getElementById('rank-list');

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
    // 重新设计的平滑难度曲线（适配10行8列布局）：
    
    // 1. 方块种类增加：
    // 棋盘变小（12x8 -> 10x8），连击几率略微降低
    // 第1-3关: 4种 (简单，容易熟悉)
    // 第4-8关: 5种
    // 第9-14关: 6种
    // 第15-20关: 7种
    // 第21-30关: 8种
    // 31关以上: 9种
    let tileCount;
    if (lvl <= 3) tileCount = 4;
    else if (lvl <= 8) tileCount = 5;
    else if (lvl <= 14) tileCount = 6;
    else if (lvl <= 20) tileCount = 7;
    else if (lvl <= 30) tileCount = 8;
    else tileCount = 9;
    
    // 2. 目标分数增加：
    // 由于格子减少了约16%，目标分数也相应微调，保持节奏
    // 基础分数 70，每关增加 35 + (lvl * 4)
    // 第1关: 70
    // 第2关: 113
    // 第3关: 161
    // 第10关: 640
    const targetScore = 70 + (lvl - 1) * (35 + (lvl * 4));
    
    // 3. 初始步数：
    // 每关递增 5 步，基础 25 步
    const initialMoves = 25 + (lvl - 1) * 5;

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
    // 逻辑顺序调整：先处理上一关的溢出分
    console.log(`Starting Level ${lvl}. Score before transition: ${score}, Old Target: ${target}`);
    
    let overflow = 0;
    if (score >= target) {
        overflow = score - target;
        console.log(`Overflow detected: ${overflow}`);
    }
    
    // 加载新配置
    const config = getLevelConfig(lvl);
    currentTileTypes = config.tileTypes;
    target = config.target;
    moves = config.moves;
    
    // 应用溢出分（如果有）
    score = overflow;
    console.log(`New Level ${lvl} started. Starting score: ${score}, Target: ${target}`);
    
    // 清除可能存在的下一关按钮
    const nextBtn = document.getElementById('next-level-btn');
    if (nextBtn) nextBtn.remove();
    
    // 清除可能存在的“回到第1关”按钮
    const backBtn = document.getElementById('back-to-main-btn');
    if (backBtn) backBtn.remove();
    
    // 设置重新开始按钮为“重新挑战”并绑定当前关卡
    restartBtn.innerText = lvl === 1 ? "重新开始" : "重新挑战";
    restartBtn.onclick = () => startLevel(lvl);
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

    // 如果已经选中了一个方块，且点击的是另一个方块
    if (selectedTile !== null && selectedTile !== index) {
        const x1 = selectedTile % COLS;
        const y1 = Math.floor(selectedTile / COLS);
        const x2 = index % COLS;
        const y2 = Math.floor(index / COLS);
        
        // 检查是否相邻
        const isAdjacent = Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
        
        if (isAdjacent) {
            const prevSelected = selectedTile;
            selectedTile = null; // 清除选中状态，防止与滑动逻辑冲突
            swapTiles(prevSelected, index);
            return;
        }
    }

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
        // 检查是否有超级方块被匹配
        let superTileMatched = false;
        let superTileIndices = [];
        
        matches.forEach(idx => {
            if (board[idx] === SUPER_TILE) {
                superTileMatched = true;
                superTileIndices.push(idx);
            }
        });

        // 如果匹配到了超级方块，扩展匹配范围到整行整列
        if (superTileMatched) {
            let expandedMatches = new Set(matches);
            superTileIndices.forEach(idx => {
                const r = Math.floor(idx / COLS);
                const c = idx % COLS;
                // 整行
                for (let i = 0; i < COLS; i++) expandedMatches.add(r * COLS + i);
                // 整列
                for (let i = 0; i < ROWS; i++) expandedMatches.add(i * COLS + c);
            });
            matches = Array.from(expandedMatches);
        }

        // Animation
        matches.forEach(idx => {
            const el = tileElements[idx];
            if (el) {
                el.classList.add('match');
                if (board[idx] === SUPER_TILE) el.classList.add('super-match');
                createParticles(idx);
            }
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
            // 判定是否生成超级方块
            let type;
            if (Math.random() < SUPER_TILE_CHANCE) {
                type = SUPER_TILE;
            } else {
                type = currentTileTypes[Math.floor(Math.random() * currentTileTypes.length)];
            }
            
            board[i] = type;
            
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            tileElement.dataset.index = i; // 修复：补充缺失的 index
            tileElement.innerText = type;
            if (type === SUPER_TILE) tileElement.classList.add('super-tile');
            
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
    console.log(`Checking game over. Score: ${score}, Target: ${target}`);
    if (score >= target) {
        // 过关逻辑
        document.getElementById('overlay-title').innerText = `恭喜过关！`;
        // 显示本关总得分（包含溢出）
        document.getElementById('overlay-score').innerText = `本关总得分: ${score}`;
        
        // 关键修复：在弹出过关界面前，不应重置 score，但在 startLevel 中会用到它
        // 目前逻辑正确：score 保留了超过 target 的值，直到 startLevel(level + 1) 被调用
        
        if (!document.getElementById('next-level-btn')) {
            const nextBtn = document.createElement('button');
            nextBtn.id = 'next-level-btn';
            nextBtn.innerText = `进入第 ${level + 1} 关`;
            nextBtn.onclick = () => {
                level++;
                // 更新进度并存盘
                if (userData) {
                    userData.level = level;
                    userData.totalScore += score;
                    saveUserData();
                }
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
    
    // 设置重新挑战按钮
    restartBtn.innerText = "重新挑战";
    restartBtn.onclick = () => startLevel(level);
    
    // 添加一个回到第1关的按钮，方便用户想彻底重来时使用
    if (!document.getElementById('back-to-main-btn')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'back-to-main-btn';
        backBtn.innerText = '回到第1关';
        backBtn.onclick = () => {
            if (userData) {
                userData.level = 1;
                saveUserData();
            }
            initGame();
        };
        restartBtn.parentNode.appendChild(backBtn);
    }
    
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

// --- UI Logic ---

let authMode = 'login'; // 'login' or 'register'

authTabLogin.onclick = () => {
    authMode = 'login';
    authTabLogin.classList.add('active');
    authTabRegister.classList.remove('active');
    authTitle.innerText = '欢迎登录';
    confirmPasswordGroup.classList.add('hidden');
    authMsg.innerText = '';
    authSubmitBtn.innerText = '立即进入';
};

authTabRegister.onclick = () => {
    authMode = 'register';
    authTabRegister.classList.add('active');
    authTabLogin.classList.remove('active');
    authTitle.innerText = '新玩家注册';
    confirmPasswordGroup.classList.remove('hidden');
    authMsg.innerText = '';
    authSubmitBtn.innerText = '创建账号';
};

authSubmitBtn.onclick = () => {
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value;
    const confirmPassword = authConfirmPasswordInput.value;

    if (!username || !password) {
        showAuthMsg('请输入账号和密码', 'error');
        return;
    }

    if (authMode === 'register') {
        if (password !== confirmPassword) {
            showAuthMsg('两次输入的密码不一致', 'error');
            return;
        }
        
        // 注册用户
        registerToServer(username, password);
    } else {
        // 登录逻辑
        loginToServer(username, password);
    }
};

async function registerToServer(username, password) {
    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            showAuthMsg('注册成功！正在进入...', 'success');
            currentUser = username;
            userData = { level: 1, totalScore: 0 };
            setTimeout(enterGame, 1000);
        } else {
            showAuthMsg(data.error || '注册失败', 'error');
        }
    } catch (e) {
        showAuthMsg('网络错误，请稍后再试', 'error');
    }
}

async function loginToServer(username, password) {
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            showAuthMsg('登录成功！', 'success');
            currentUser = data.user.username;
            userData = data.user.progress;
            setTimeout(enterGame, 1000);
        } else {
            showAuthMsg(data.error || '登录失败', 'error');
        }
    } catch (e) {
        showAuthMsg('网络错误，请稍后再试', 'error');
    }
}

function showAuthMsg(text, type) {
    authMsg.innerText = text;
    authMsg.className = 'auth-msg ' + type;
}

function enterGame() {
    loginScreen.classList.add('hidden');
    level = userData.level || 1;
    score = 0;
    startLevel(level);
}

showRankBtn.onclick = () => {
    updateRankUI();
    rankScreen.classList.remove('hidden');
};

closeRankBtn.onclick = () => {
    rankScreen.classList.add('hidden');
};

async function saveUserData() {
    if (currentUser) {
        try {
            await fetch('/api/save_progress', {
                method: 'POST',
                body: JSON.stringify({
                    username: currentUser,
                    level: userData.level,
                    score: userData.totalScore
                })
            });
        } catch (e) {
            console.error('Failed to save progress to server', e);
        }
    }
}

async function updateRankUI() {
    try {
        const res = await fetch('/api/rank');
        const ranks = await res.json();
        
        if (!ranks || ranks.length === 0) {
            rankList.innerHTML = '<div style="padding:20px;color:#999">暂无数据</div>';
            return;
        }

        rankList.innerHTML = ranks.map((item, index) => `
            <div class="rank-item">
                <span class="rank-index">${index + 1}</span>
                <span class="rank-name">${item.name}</span>
                <span class="rank-score">${item.score}</span>
            </div>
        `).join('');
    } catch (e) {
        rankList.innerHTML = '<div style="padding:20px;color:#e74c3c">加载排行榜失败</div>';
    }
}

// 阻止默认启动，等待登录
// initGame();
