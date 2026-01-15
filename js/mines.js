/**
 * NEO SPIN - MINES ENGINE ULTIMATE
 */

// 1. ON CACHE TOUT DE SUITE pour éviter de voir le jeu avant le flou
document.body.style.opacity = "0";

// On récupère l'objet utilisateur complet
let userData = JSON.parse(localStorage.getItem('currentUser'));

// La balance est celle de l'utilisateur, ou 0 s'il n'existe pas
let balance = userData ? parseFloat(userData.balance) : 0;

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('main');
    const loginModal = document.getElementById('loginModal');

    if (!userData) {
        if (mainContent) {
            mainContent.style.filter = "blur(2px)";
            mainContent.style.pointerEvents = "none";
        }
        if (loginModal) {
            loginModal.style.display = 'flex';
        }
        document.body.style.opacity = "1";
    } else {
        document.body.style.opacity = "1";
        updateBalanceDisplay();
    }
});

// --- FONCTION UNIQUE DE MISE À JOUR (CORRIGÉE) ---
function updateBalanceDisplay() {
    // 1. On met à jour l'objet utilisateur dans le stockage
    if (userData) {
        userData.balance = balance;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('casinoBalance', balance);
    }
    
    // 2. On appelle updateUI() SANS avoir changé le texte avant.
    // C'est updateUI qui va voir la différence entre l'écran et le localStorage et lancer l'animation.
    if (typeof updateUI === 'function') {
        updateUI();
    }
}

const gameConfig = {
    gridSize: 25,
    houseEdge: 0.97
};

let gameState = {
    mines: [],
    revealedCount: 0,
    isGameOver: false,
    currentMultiplier: 1.00,
    isPlaying: false,
    betAmount: 0
};

document.addEventListener('DOMContentLoaded', () => {
    const mineSelect = document.getElementById('mineSelect');
    const playBtn = document.getElementById('playBtnMines');
    const betInput = document.getElementById('betAmountInput');

    mineSelect.onchange = () => {
        document.getElementById('gemsCountDisplay').value = gameConfig.gridSize - parseInt(mineSelect.value);
    };

    document.querySelector('.half-btn').onclick = () => {
        betInput.value = (Math.max(0.01, parseFloat(betInput.value) / 2)).toFixed(2);
    };

    document.querySelector('.double-btn').onclick = () => {
        betInput.value = (parseFloat(betInput.value) * 2).toFixed(2);
    };

    playBtn.onclick = handleMainButtonClick;
    resetBoard();
});

function handleMainButtonClick() {
    if (!gameState.isPlaying) startNewGame();
    else cashOut();
}

function startNewGame() {
    const betInput = document.getElementById('betAmountInput');
    const amount = parseFloat(betInput.value) || 0;
    
    if(amount <= 0 || amount > balance) {
        showNotify("Solde insuffisant pour cette mise", 'error');
        return;
    }

    // Déduction de la mise
    balance -= amount;
    updateBalanceDisplay(); // Utilise la fonction unique pour sauver et animer

    gameState.betAmount = amount;
    gameState.mines = [];
    gameState.revealedCount = 0;
    gameState.isGameOver = false;
    gameState.currentMultiplier = 1.00;
    gameState.isPlaying = true;

    const mineSelect = document.getElementById('mineSelect');
    const positions = [...Array(gameConfig.gridSize).keys()].sort(() => Math.random() - 0.5);
    gameState.mines = positions.slice(0, parseInt(mineSelect.value));

    updateGameStatusUI(1.00, "Good luck!");
    
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    
    mineSelect.disabled = true;
    betInput.disabled = true;

    for (let i = 0; i < gameConfig.gridSize; i++) {
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.onclick = () => revealCell(cell, i);
        grid.appendChild(cell);
    }

    const btn = document.getElementById('playBtnMines');
    btn.innerText = "Cashout 0.00";
    btn.disabled = true; 
}

function revealCell(cell, index) {
    if (gameState.isGameOver || !gameState.isPlaying || cell.classList.contains('revealed')) return;

    cell.classList.add('revealed');

    if (gameState.mines.includes(index)) {
        cell.classList.add('revealed-mine');
        endGame(false);
    } else {
        cell.classList.add('revealed-star');
        gameState.revealedCount++;
        calculateMultiplier();
        
        const btn = document.getElementById('playBtnMines');
        btn.disabled = false;
        btn.innerText = `Cashout ${(gameState.currentMultiplier * gameState.betAmount).toFixed(2)} €`;
        
        updateGameStatusUI(gameState.currentMultiplier, "Keep going!");
    }
}

function calculateMultiplier() {
    const n = gameConfig.gridSize;
    const m = gameState.mines.length;
    const k = gameState.revealedCount;
    const nCr = (n, r) => {
        let res = 1;
        for (let i = 1; i <= r; i++) res = res * (n - i + 1) / i;
        return res;
    };
    const probability = nCr(n - m, k) / nCr(n, k);
    gameState.currentMultiplier = (1 / probability) * gameConfig.houseEdge;
}

function cashOut() {
    if (!gameState.isPlaying || gameState.isGameOver) return;
    
    const winAmount = gameState.currentMultiplier * gameState.betAmount;
    balance += winAmount;
    
    updateBalanceDisplay(); // Sauvegarde et déclenche l'animation
    endGame(true);
}

function endGame(isWin) {
    gameState.isGameOver = true;
    gameState.isPlaying = false;
    
    const btn = document.getElementById('playBtnMines');
    const cells = document.querySelectorAll('.cell');
    
    gameState.mines.forEach(idx => {
        if (!cells[idx].classList.contains('revealed-star')) {
            cells[idx].classList.add('revealed-mine');
        }
    });

    const status = document.getElementById('jetxStatus');
    status.innerText = isWin ? "WINNER!" : "BUST!";
    status.style.color = isWin ? "#00e701" : "#ef4444";

    btn.innerText = "Bet";
    btn.disabled = false;
    document.getElementById('mineSelect').disabled = false;
    document.getElementById('betAmountInput').disabled = false;
}

// J'ai renommé cette fonction pour éviter le conflit avec updateUI() du script global
function updateGameStatusUI(mult, msg) {
    const multEl = document.getElementById('currentMultDisplay');
    const profitEl = document.getElementById('profitInput');
    const statusEl = document.getElementById('jetxStatus');

    multEl.innerText = mult.toFixed(2) + "x";
    profitEl.value = (mult * gameState.betAmount).toFixed(2);
    statusEl.innerText = msg;

    // Si on a gagné au moins un diamant, on met le texte en vert néon
    if (mult > 1) {
        multEl.style.color = "var(--accent-neon)";
        profitEl.style.color = "var(--accent-neon)";
    }
}

function resetBoard() {
    document.getElementById('minesGrid').innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#64748b; padding-top:100px; font-weight:700;">PLACE YOUR BET</div>';
}

function checkAuth() {
    if (!localStorage.getItem('currentUser')) {
        window.location.href = "index.html?action=login";
    }
}