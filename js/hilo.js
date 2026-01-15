// --- INITIALISATION ---
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const symbols = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

let userData = JSON.parse(localStorage.getItem('currentUser'));
let balance = userData ? parseFloat(userData.balance) : 0;
let currentCard = null, isPlaying = false, totalProfit = 0;

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('main');
    const loginModal = document.getElementById('loginModal');

    if (!userData) {
        if (mainContent) {
            mainContent.style.filter = "blur(4px)";
            mainContent.style.pointerEvents = "none";
        }
        if (loginModal) loginModal.style.display = 'flex';
        document.body.style.opacity = "1";
    } else {
        document.body.style.opacity = "1";
        initGameDisplay(); 
        updateUI();
    }
});

function drawCard() {
    const v = values[Math.floor(Math.random() * values.length)];
    const s = ['H', 'D', 'C', 'S'][Math.floor(Math.random() * 4)];
    return { v, s, val: values.indexOf(v), color: (s==='H'||s==='D') ? 'red' : 'black' };
}

function renderCard() {
    const cardEl = document.getElementById('currentCard');
    // On garde card-pro mais on s'assure de ne pas supprimer les glows trop vite
    cardEl.className = `card-pro ${currentCard.color}`;
    cardEl.innerHTML = `<div>${currentCard.v}</div><div class="symbol">${symbols[currentCard.s]}</div>`;
}

// --- LOGIQUE DE JEU ---

async function guess(direction) {
    if (!isPlaying) return;
    
    // Bloquer les boutons pendant l'animation
    const buttons = document.querySelectorAll('.action-hilo, #cashoutBtn');
    buttons.forEach(b => b.disabled = true);

    const mult = parseFloat(document.getElementById(direction === 'higher' ? 'multHigher' : 'multLower').innerText);
    const nextCard = drawCard();
    
    // Comparaison des valeurs
    const win = (direction === 'higher' && nextCard.val > currentCard.val) || 
                (direction === 'lower' && nextCard.val < currentCard.val);

    const cardEl = document.getElementById('currentCard');
    
    // 1. Envoyer l'ancienne carte dans l'historique
    cardEl.classList.add('card-to-history');
    await sleep(300);

    const hist = document.getElementById('historyCards');
    hist.insertAdjacentHTML('afterbegin', `<div class="card-pro ${currentCard.color}" style="transform: scale(0.7); margin-right:-20px;"><div>${currentCard.v}</div><div class="symbol">${symbols[currentCard.s]}</div></div>`);

    // 2. Mettre à jour avec la nouvelle carte
    currentCard = nextCard;
    cardEl.classList.remove('card-to-history', 'winner-glow', 'loser-glow');
    renderCard();
    
    // Petit délai pour laisser la carte apparaître avant de mettre le contour
    await sleep(100);

    if (win) {
        totalProfit *= mult;
        document.getElementById('cashoutBtn').innerHTML = `CASHOUT <span>${totalProfit.toFixed(2)}€</span>`;
        calculateOdds();
        
        // --- EFFET DE VICTOIRE (BORDURE VERTE) ---
        cardEl.classList.add('winner-glow');
        showNotify("Correct !", "success");
        
        await sleep(500); // On laisse briller le vert
        buttons.forEach(b => b.disabled = false);
    } else {
        // --- EFFET DE DÉFAITE (BORDURE ROUGE) ---
        endGame("❌ PERDU");
    }
}

function endGame(msg) {
    isPlaying = false;
    const isWin = msg.includes('VIC');
    const cardEl = document.getElementById('currentCard');

    if (isWin) {
        cardEl.classList.add('winner-glow');
    } else {
        cardEl.classList.add('loser-glow');
    }

    showNotify(msg, isWin ? 'success' : 'error');
    
    document.getElementById('playBtnHiLo').style.display = 'block';
    document.getElementById('hiloActions').style.display = 'none';
    
    const buttons = document.querySelectorAll('.action-hilo, #cashoutBtn');
    buttons.forEach(b => b.disabled = false);
    updateUIBalance();
}

// --- BOUTONS ET UI ---

document.getElementById('playBtnHiLo').onclick = () => {
    const amount = parseFloat(document.getElementById('betAmountInput').value) || 0;
    if(amount <= 0 || amount > balance) return showNotify("Solde insuffisant", "error");

    // RESET VISUEL
    document.getElementById('currentCard').classList.remove('winner-glow', 'loser-glow');
    document.getElementById('historyCards').innerHTML = "";

    balance -= amount;
    totalProfit = amount;
    isPlaying = true;
    updateUIBalance();

    document.getElementById('playBtnHiLo').style.display = 'none';
    document.getElementById('hiloActions').style.display = 'flex';
    document.getElementById('cashoutBtn').innerHTML = `CASHOUT <span>${amount.toFixed(2)}€</span>`;
    
    // IMPORTANT : On ne rappelle pas initGameDisplay ici sinon ça change la carte !
    calculateOdds();
};


function cashOut() {
    balance += totalProfit;
    endGame("🏆 VICTOIRE !");
}

function calculateOdds() {
    const total = 12; 
    const higherCards = 12 - currentCard.val; 
    const lowerCards = currentCard.val;

    const probaHigh = higherCards / total;
    const probaLow = lowerCards / total;

    let multHigh = probaHigh > 0 ? (0.97 / probaHigh) : 0;
    let multLow = probaLow > 0 ? (0.97 / probaLow) : 0;

    const btnHigh = document.getElementById('btnHigher');
    const btnLow = document.getElementById('btnLower');

    if (btnHigh && btnLow) {
        btnHigh.disabled = (higherCards === 0);
        btnLow.disabled = (lowerCards === 0);

        btnHigh.innerHTML = `HIGHER <small>(x<span id="multHigher">${multHigh.toFixed(2)}</span>)</small>`;
        btnLow.innerHTML = `LOWER <small>(x<span id="multLower">${multLow.toFixed(2)}</span>)</small>`;
    }
}

function initGameDisplay() {
    currentCard = drawCard();
    renderCard();
    calculateOdds();
}

function updateUIBalance() {
    if(userData) {
        userData.balance = balance;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        if (typeof updateUI === "function") updateUI();
    }
}