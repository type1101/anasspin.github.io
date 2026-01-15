// --- BLOC DE SÉCURITÉ (Identique aux Mines) ---
document.body.style.opacity = "0";

// On récupère l'utilisateur
let userData = JSON.parse(localStorage.getItem('currentUser'));
let balance = userData ? parseFloat(userData.balance) : 0;

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('main');
    const loginModal = document.getElementById('loginModal');

    if (!userData) {
        // Au lieu de rediriger, on fait comme dans les Mines :
        if (mainContent) {
            mainContent.style.filter = "blur(4px)";
            mainContent.style.pointerEvents = "none";
        }
        if (loginModal) {
            loginModal.style.display = 'flex';
        }
        document.body.style.opacity = "1";
    } else {
        document.body.style.opacity = "1";
        // On s'assure que l'UI affiche la balance
        if (typeof updateUI === "function") {
            updateUI();
        } else {
            document.getElementById('userBalance').innerText = balance.toFixed(2);
        }
    }
});

// ... reste de ton code blackjack.js (deck, hands, etc.) ...


let deck = [], pHand = [], dHand = [], currentBet = 0;

const symbols = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };

function createDeck() {
    deck = [];
    ['H', 'D', 'C', 'S'].forEach(s => {
        ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].forEach(v => {
            deck.push({ v, s, color: (s==='H'||s==='D') ? 'red' : 'black' });
        });
    });
    deck.sort(() => Math.random() - 0.5);
}

function getVal(hand) {
    let score = 0, aces = 0;
    hand.forEach(c => {
        if (c.v === 'A') aces++;
        else score += (['J','Q','K'].includes(c.v)) ? 10 : parseInt(c.v);
    });
    for(let i=0; i<aces; i++) score += (score + 11 > 21) ? 1 : 11;
    return score;
}

document.getElementById('playBtnBJ').onclick = startBJ;

function startBJ() {
    let input = document.getElementById('betAmountInput');
    currentBet = parseFloat(input.value) || 0 ;
    if(currentBet > balance || currentBet <= 0) {
        showNotify("Solde insuffisant", "error");
        return;
    }

    balance -= currentBet;
    updateUIBalance();
    
    createDeck();
    pHand = [deck.pop(), deck.pop()];
    dHand = [deck.pop(), deck.pop()];

    document.getElementById('playBtnBJ').style.display = 'none';
    document.getElementById('bjActions').style.display = 'flex';
    document.getElementById('gameStatus').innerText = "";
    render();
}

function render(showAll = false) {
    const pDiv = document.getElementById('player-cards');
    const dDiv = document.getElementById('dealer-cards');

    // On réinitialise les conteneurs (nettoyage des contours de la partie d'avant)
    pDiv.className = "hand"; 
    dDiv.className = "hand";

    // Affichage des cartes du joueur
    pDiv.innerHTML = pHand.map(c => `<div class="card-pro ${c.color}"><div>${c.v}</div><div class="symbol">${symbols[c.s]}</div></div>`).join('');
    
    if(!showAll) {
        // Mode pendant le jeu : une carte du croupier est cachée
        dDiv.innerHTML = `<div class="card-pro ${dHand[0].color}"><div>${dHand[0].v}</div><div class="symbol">${symbols[dHand[0].s]}</div></div>` + 
                         `<div class="card-pro hidden-card"></div>`;
        
        // On place les scores dans les badges stylisés
        document.getElementById('p-score').innerHTML = `<span class="score-badge-pro">${getVal(pHand)}</span>`;
        document.getElementById('d-score').innerHTML = `<span class="score-badge-pro">${getVal([dHand[0]])}</span>`;
    } else {
        // Mode fin de jeu : on révèle tout
        dDiv.innerHTML = dHand.map(c => `<div class="card-pro ${c.color}"><div>${c.v}</div><div class="symbol">${symbols[c.s]}</div></div>`).join('');
        
        document.getElementById('p-score').innerHTML = `<span class="score-badge-pro">${getVal(pHand)}</span>`;
        document.getElementById('d-score').innerHTML = `<span class="score-badge-pro">${getVal(dHand)}</span>`;
    }
}

function hit() {
    pHand.push(deck.pop());
    render();
    if(getVal(pHand) > 21) endBJ("BUST !");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function stand() {
    // Désactiver les boutons pour éviter le spam
    document.getElementById('bjActions').style.display = 'none';
    
    // 1. Révéler la carte cachée
    render(true); 
    await sleep(800);

    // 2. Tirage automatique du croupier
    while(getVal(dHand) < 17) {
        dHand.push(deck.pop());
        render(true);
        await sleep(800); // Délai entre chaque carte tirée
    }

    // 3. Calcul du résultat final
    let p = getVal(pHand);
    let d = getVal(dHand);
    let msg = "";

    if(d > 21) {
        balance += currentBet * 2;
        msg = "LE CROUPIER SAUTE ! GAGNÉ !";
    } else if(p > d) {
        balance += currentBet * 2;
        msg = "GAGNÉ !";
    } else if(p < d) {
        msg = "PERDU";
    } else {
        balance += currentBet;
        msg = "ÉGALITÉ";
    }
    
    endBJ(msg);
}

function endBJ(msg) {
    const statusEl = document.getElementById('gameStatus');
    
    // On retire les anciennes classes d'animation
    statusEl.classList.remove('status-pop', 'status-win', 'status-loss', 'status-push');
    
    // Détermination du style selon le message
    let statusClass = "";
    let cardGlow = "";

    if (msg.includes('GAGNÉ')) {
        statusClass = "status-win";
        cardGlow = "winner-glow";
        msg = "🏆 VICTOIRE !"; // Texte plus pro
    } else if (msg.includes('PERDU') || msg.includes('BUST') || msg.includes('SAUTE')) {
        statusClass = "status-loss";
        cardGlow = "loser-glow";
        msg = msg.includes('SAUTE') ? "💥 BUST !" : "❌ DÉFAITE";
    } else {
        statusClass = "status-push";
        msg = "🤝 ÉGALITÉ";
    }

    // Application du texte et des animations
    statusEl.innerText = msg;
    statusEl.classList.add('status-pop', statusClass);

    // Glow des cartes
    const allCards = document.querySelectorAll('.card-pro');
    if (cardGlow) {
        allCards.forEach((card, index) => {
            setTimeout(() => card.classList.add(cardGlow), index * 60);
        });
    }

    // Gestion de l'UI
    document.getElementById('playBtnBJ').style.display = 'block';
    updateUIBalance();
}

function updateUIBalance() {
    userData.balance = balance;
    localStorage.setItem('currentUser', JSON.stringify(userData));
    updateUI(); 
}

function adjustBet(m) {
    let i = document.getElementById('betAmountInput');
    i.value = (parseFloat(i.value) * m).toFixed(2);
}