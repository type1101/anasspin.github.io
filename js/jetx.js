/**
 * NEO CRASH - ENGINE MINIMALISTE PRO
 */

// --- INITIALISATION DES VARIABLES ---
let userData = JSON.parse(localStorage.getItem('currentUser'));
let balance = userData ? parseFloat(userData.balance) : 0;

let gameLoop;
let currentMult = 1.00;
let isPlaying = false;
let hasCashedOut = false;
let betAmount = 0;
let startTime = 0;
let crashPoint = 0;

// Éléments DOM
const multDisplay = document.getElementById('multiplierDisplay');
const gameMsg = document.getElementById('gameMsg');
const playBtn = document.getElementById('playBtnCrash');
const cashoutBtn = document.getElementById('cashoutBtnCrash');
const canvas = document.getElementById('crashCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIGURATION CANVAS ---
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- SÉCURITÉ & AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    if (!userData) {
        document.querySelector('main').style.filter = "blur(4px)";
        document.getElementById('loginModal').style.display = 'flex';
    } else {
        if (typeof updateUI === "function") updateUI();
    }
});

// --- FONCTIONS UTILITAIRES ---
function adjustBet(m) {
    let i = document.getElementById('betAmountInput');
    i.value = (parseFloat(i.value) * m).toFixed(2);
}

function saveAndSync() {
    if(userData) {
        userData.balance = balance;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        if (typeof updateUI === "function") updateUI();
    }
}

function generateCrashPoint() {
    const r = Math.random();
    if (r < 0.03) return 1.00; // 3% de chance de crash instantané
    return Math.max(1.01, (0.98 / (1 - r)));
}

// --- MOTEUR DE RENDU GRAPHIQUE ---
function drawGraph(elapsed, color = "#00ff5f") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // LOGIQUE DE CAMÉRA DYNAMIQUE
    // Plus le temps passe, plus on réduit l'échelle pour "dézoomer" et suivre la boule
    const scaleX = Math.max(0.5, 1 - (elapsed * 0.05)); 
    const scaleY = Math.max(0.4, 1 - (elapsed * 0.08));

    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.translate(0, canvas.height * (1 - scaleY) / scaleY); // Ajuste la base du graphique

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for (let i = 0; i <= elapsed * 20; i++) {
        let x = i * 15;
        let y = canvas.height - (Math.pow(i, 1.5) * 0.8);
        
        ctx.lineTo(x, y);
        
        if (i >= (elapsed * 20) - 1) {
            ctx.stroke();
            // La "Boule" lumineuse
            ctx.beginPath();
            ctx.fillStyle = "white";
            ctx.shadowBlur = 30;
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// --- LOGIQUE DE JEU ---
playBtn.onclick = startFlight;
cashoutBtn.onclick = cashOut;

document.addEventListener('DOMContentLoaded', () => {
    playBtn.style.display = 'block';
    cashoutBtn.style.display = 'none';
    if (userData) updateUI();
});

function startFlight() {
    if (isPlaying) return;

    betAmount = parseFloat(document.getElementById('betAmountInput').value);
    if (isNaN(betAmount) || betAmount > balance || betAmount <= 0) {
        showNotify("Montant invalide", "error");
        return;
    }

    balance -= betAmount;
    saveAndSync();

    // --- ÉTAT INITIAL ---
    isPlaying = true;
    hasCashedOut = false;
    currentMult = 1.00;
    startTime = Date.now();
    crashPoint = generateCrashPoint();
    
    // --- UI TOGGLE ---
    playBtn.style.display = 'none';
    cashoutBtn.style.display = 'block'; // Affiche Encaisser
    multDisplay.classList.remove('win', 'crash');
    multDisplay.style.color = "white";
    gameMsg.innerText = "Partie en cours...";

    gameLoop = setInterval(() => {
        let elapsed = (Date.now() - startTime) / 1000;
        currentMult = Math.pow(Math.E, 0.06 * elapsed);
        
        if (currentMult >= crashPoint) {
            triggerCrash(crashPoint);
            return;
        }

        multDisplay.innerText = currentMult.toFixed(2) + "x";
        drawGraph(elapsed);

        // Mise à jour du bouton avec le gain live
        if (!hasCashedOut) {
            const liveGain = (betAmount * currentMult).toFixed(2);
            cashoutBtn.innerHTML = `ENCAISSER <span>${liveGain} €</span>`;
        }

        // Auto-cashout
        const autoLimit = parseFloat(document.getElementById('autoCashoutInput').value);
        if (!hasCashedOut && autoLimit > 1.01 && currentMult >= autoLimit) {
            cashOut();
        }
    }, 50);
}

function cashOut() {
    // Sécurité : on ne peut encaisser que si on joue et qu'on n'a pas déjà encaissé
    if (!isPlaying || hasCashedOut) return;
    
    hasCashedOut = true;
    const win = betAmount * currentMult;
    balance += win;
    saveAndSync();
    
    // UI FEEDBACK
    cashoutBtn.style.display = 'none'; // Disparaît immédiatement après clic
    multDisplay.classList.add('win'); 
    gameMsg.innerText = `GAGNÉ : ${win.toFixed(2)}€`;
    showNotify(`+${win.toFixed(2)}€`, "success");
}

function triggerCrash(point) {
    clearInterval(gameLoop);
    isPlaying = false;
    
    // FORCE LE BOUTON À DISPARAÎTRE (Même si le joueur n'a pas cliqué)
    cashoutBtn.style.display = 'none';
    
    multDisplay.classList.remove('win');
    multDisplay.classList.add('crash');
    multDisplay.innerText = point.toFixed(2) + "x";
    gameMsg.innerText = "CRASH !";

    drawGraph((Date.now() - startTime) / 1000, "#ef4444");

    // On attend la fin de l'animation de crash avant de réautoriser le bouton parier
    setTimeout(() => {
        if (!isPlaying) { // Vérification de sécurité
            playBtn.style.display = 'block';
            multDisplay.classList.remove('crash');
            multDisplay.style.color = "white";
            multDisplay.innerText = "1.00x";
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            gameMsg.innerText = "Prêt pour une nouvelle partie ?";
        }
    }, 3000);
}