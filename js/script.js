/**
 * NEO SPIN - Moteur Global (Front-end)
 */

// --- NETTOYAGE DE L'URL AU CHARGEMENT ---
window.onload = function() {
    if (window.location.search.length > 0) {
        // Cette ligne retire tout ce qui se trouve après le '?' dans l'URL sans recharger la page
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
};




// Fonction pour animer le changement de solde
function animateValue(element, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = (progress * (end - start) + start).toFixed(2);
        element.innerText = parseFloat(value).toLocaleString('fr-FR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- GESTION DES MODALS (OUVERTURE / FERMETURE) ---
function openSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) modal.style.display = 'flex';
}

function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) modal.style.display = 'none';
}

function openModal(id) {
    const modal = document.getElementById(`${id}Modal`);
    if(modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(`${id}Modal`);
    if(modal) modal.style.display = 'none';
}

// Fermeture si on clique en dehors de la fenêtre blanche
window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
};

// FONCTION VISIBILITÉ DU MOT DE PASSE (L'œil)
function togglePasswordVisibility(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}


function toggleUserMenu() {
    const menu = document.getElementById('userDropdown');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Fermer le menu si on clique ailleurs sur la page
window.addEventListener('click', function(e) {
    const menu = document.getElementById('userDropdown');
    const userInfo = document.querySelector('.user-info');
    if (menu && !menu.contains(e.target) && !userInfo.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// --- LOGIQUE D'INSCRIPTION ---
async function handleSignup(e) {
    e.preventDefault();
    
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const dobValue = document.getElementById('regDob').value;

    const passError = document.getElementById('passError');
    const ageError = document.getElementById('ageError');

    // Vérifications classiques
    if (pass !== confirm) {
        passError.style.display = 'block';
        return;
    } else {
        passError.style.display = 'none';
    }

    if (pass.length < 8) {
        showNotify("Le mot de passe doit contenir au moins 8 caractères", "error");
        return;
    }

    // Vérification âge
    const dob = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 18) {
        ageError.style.display = 'block';
        return;
    } else {
        ageError.style.display = 'none';
    }

    const userData = { username, email, password: pass };

    try {
        const response = await fetch('https://anasspin-github-io.onrender.com/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotify("Bienvenue à bord ! Votre compte est prêt.", 'success'); 

            /**
             * CORRECTION MAJEURE :
             * On enregistre l'utilisateur renvoyé par le serveur (result.user).
             * Cet objet contient le vrai solde, le vrai ID et le vrai createdAt.
             */
            const userToStore = result.user; 

            // Sauvegarde dans le navigateur
            localStorage.setItem('currentUser', JSON.stringify(userToStore));
            localStorage.setItem('casinoBalance', userToStore.balance || 0);

            closeSignupModal();
            updateUI(); // Mise à jour du header avec l'avatar et le pseudo
            document.getElementById('signupForm').reset();
            
            // Petit bonus : on recharge après 1.5s pour être sûr que tout est propre
            setTimeout(() => location.reload(), 1500);

        } else {
            showNotify(result.message || "Erreur lors de l'inscription", 'error');
        }
    } catch (error) {
        console.error("Erreur de connexion :", error);
        showNotify("Impossible de contacter le serveur.", "error");
    }
}

// --- GESTION DE LA CONNEXION (LOGIN) ---
async function handleLogin(e) {
    e.preventDefault();
    
    // On essaie de récupérer les deux IDs possibles pour être compatible avec index et mines
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPass') || document.getElementById('loginPassword');

    if (!emailInput || !passInput) {
        console.error("Erreur : Formulaire de connexion introuvable dans le HTML.");
        return;
    }

    const email = emailInput.value;
    const password = passInput.value;

    try {
        const response = await fetch('https://anasspin-github-io.onrender.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        // À l'intérieur de handleLogin dans script.js
        // Dans js/script.js -> handleLogin
        if (response.ok) {
            showNotify("Connexion réussie !", 'success');
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            localStorage.setItem('casinoBalance', result.user.balance);

            setTimeout(() => {
                closeModal('login');
                
                // On force la mise à jour de l'UI AVANT de recharger/rediriger
                updateUI(); 

                const urlParams = new URLSearchParams(window.location.search);
                
                // Sur mobile, pour forcer le rafraîchissement propre :
                if (window.location.pathname.includes('blackjack.html')) {
                    window.location.replace('blackjack.html'); // .replace est plus radical que .href
                } else {
                    // Ajout d'un paramètre bidon pour casser le cache au rechargement
                    window.location.href = "index.html?login=success&t=" + new Date().getTime();
                }
            }, 1000);
        } else {
    // Notif d'erreur si le serveur refuse
            showNotify(result.message, 'error');
        }
            } catch (error) {
                showNotify("Serveur hors ligne.", "error");
            }
}



// FONCTION POUR CHANGER D'AVATAR EHE

async function changeAvatar(seed) {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    const user = JSON.parse(localStorage.getItem('currentUser'));

    try {
        const response = await fetch('https://anasspin-github-io.onrender.com/api/update-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id || user.id, avatarUrl })
        });

        if (response.ok) {
            // Mettre à jour l'image en direct
            document.getElementById('current-avatar').src = avatarUrl;

            // pour mettre à jour le header en direct :
            const headerAv = document.getElementById('header-avatar');
            if (headerAv) headerAv.src = avatarUrl;
            
            // Mettre à jour le localStorage
            user.avatar = avatarUrl;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // Mettre à jour l'image dans le Header si tu en as une
            updateUI(); 
            showNotify("Avatar mis à jour !", "success");
        }
    } catch (err) {
        showNotify("Erreur lors du changement d'avatar", "error");
    }
}






// --- MISE À JOUR DYNAMIQUE DE L'INTERFACE (HEADER) ---
let lastBalance = 0; // On garde en mémoire le dernier solde connu

function updateUI() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    const newBalance = parseFloat(user.balance) || 0;
    const avatarSrc = user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky";
    
    // --- 1. LOGIQUE MODE DISCRET ---
    const isHidden = localStorage.getItem('hideBalance') === 'true';
    const balanceDisplay = isHidden 
        ? "∗∗∗∗ €" 
        : `${newBalance.toFixed(2)} <span style="color: #00e701;">€</span>`;

    // --- 2. MISE À JOUR DES ÉLÉMENTS STATIQUES (S'ILS EXISTENT) ---
    const balanceElements = document.querySelectorAll('.user-balance, #userBalance, .balance-amount');
    balanceElements.forEach(el => {
        if (isHidden) {
            el.innerText = '∗∗∗∗ €';
        } else {
            let rawText = el.innerText.replace(',', '.').replace(/[^\d.]/g, '');
            const currentDisplayedValue = parseFloat(rawText) || 0;

            if (Math.abs(currentDisplayedValue - newBalance) > 0.01) {
                if (currentDisplayedValue > 1000000000) { 
                    el.innerText = newBalance.toFixed(2);
                } else {
                    animateValue(el, currentDisplayedValue, newBalance, 300); 
                }
            } else {
                el.innerText = newBalance.toLocaleString('fr-FR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            }
        }
    });

    // --- 3. INJECTION DU MENU HEADER (STYLE STAKE) ---
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <div class="user-menu-container" style="position: relative; display: flex; align-items: center; height: 100%;">
                <div class="user-info" onclick="toggleUserMenu()" style="
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    gap: 12px;
                    padding: 8px 12px;
                    border-radius: 4px;
                    transition: background 0.2s;
                    user-select: none;
                ">
                    <div style="text-align: right;">
                        <div style="color: white; font-weight: 700; font-size: 0.95rem; line-height: 1.1;">
                            ${balanceDisplay} </div>
                        <div style="color: #b1bad3; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Portefeuille</div>
                    </div>

                    <img id="header-avatar" src="${avatarSrc}" style="
                        width: 34px; 
                        height: 34px; 
                        border-radius: 4px; 
                        object-fit: cover;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    ">
                    
                    <i class="fas fa-chevron-down" style="font-size: 0.7rem; color: #b1bad3; margin-left: 2px;"></i>
                </div>

                <div id="userDropdown" style="
                    display: none; 
                    position: absolute; 
                    top: 55px; 
                    right: 0; 
                    width: 240px; 
                    background: #0f212e; 
                    border-radius: 4px; 
                    box-shadow: 0 15px 35px rgba(0,0,0,0.6); 
                    z-index: 1000; 
                    padding: 8px 0;
                    border: 1px solid rgba(255,255,255,0.05);
                ">
                    <div style="padding: 12px 20px; border-bottom: 1px solid #1a2c38; margin-bottom: 8px;">
                        <div style="font-size: 0.7rem; color: #b1bad3; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Mon Compte</div>
                        <div style="margin-top: 5px; color: white; font-weight: 600; font-size: 0.9rem;">${user.username}</div>
                    </div>

                    <a href="#" onclick="openAccountModal('profile-tab')" class="stake-item"><i class="fas fa-user"></i> Profil</a>
                    <a href="#" onclick="openAccountModal('stats-tab')" class="stake-item"><i class="fas fa-chart-line"></i> Statistiques</a>
                    <a href="#" onclick="openAccountModal('security-tab')" class="stake-item"><i class="fas fa-shield-alt"></i> Sécurité</a>
                    
                    <div style="height: 1px; background: #1a2c38; margin: 8px 0;"></div>
                    
                    <a href="#" onclick="logout()" class="stake-item" style="color: #ed4444;"><i class="fas fa-sign-out-alt"></i> Déconnexion</a>
                </div>

                
                <button onclick="openCashier()" class="btn-wallet-stake" style="
                    color: #1a1d23;
                    text-shadow: 0 0 30px rgba(250, 204, 21, 0.4);
                    margin-left : 15px;
                    background: var(--accent-gold);
                    /* color: black; */
                    border: none;
                    padding: 9px 17px;
                    border-radius: 8px;
                    font-weight: 800;
                    cursor: pointer;
                    margin-right: 10px;
                    font-size: 0.85rem;
                ">
                    Portefeuille
                </button>
            </div>
        `;
    }

    // --- 4. SYNCHRONISATION DU BOUTON DANS LA MODAL ---
    const toggleInput = document.getElementById('hideBalanceToggle');
    if (toggleInput) {
        toggleInput.checked = isHidden;
    }
}

// --- DÉCONNEXION ---
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('casinoBalance');
    location.reload(); // Retour à l'état "Visiteur"
}

// ca vient verifié si on est login si je lance le jeu sans compte ca me prop de me co
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    // Si l'URL contient ?action=login, on ouvre le modal proprement
    if (urlParams.get('action') === 'login') {
        openModal('login');
    }
});


// quand je suis co le bouton recup bonus meme sur deposit.html
function handleBonusClick() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        window.location.href = 'deposit.html';
    } else {
        openSignupModal();
    }
}



// BOUTON PORTEFEUILLE
// Changer d'onglet dans la caisse
function switchCashierTab(tab) {
    // Désactiver tous les onglets
    document.querySelectorAll('.cashier-tab').forEach(t => t.classList.remove('active'));
    // Masquer tous les corps
    document.querySelectorAll('.cashier-body').forEach(b => b.classList.remove('active'));
    
    // Activer l'onglet cliqué (via event)
    if (event) {
        event.currentTarget.classList.add('active');
    }
    
    // Afficher la bonne section
    document.getElementById(`${tab}-section`).classList.add('active');
}

// Copier l'adresse crypto
function copyToClipboard(id) {
    const copyText = document.getElementById(id);
    if (!copyText) return;
    
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    
    // Utilisation de ta fonction de notification existante
    showNotify("Adresse copiée avec succès !", "success");
}

// Ouvrir la caisse
function openCashier() {
    const modal = document.getElementById('cashierModal');
    if (modal) {
        modal.style.display = 'flex'; // Utilise flex pour que justify/align-center fonctionnent
        updateUI(); 
    }
}


function updateCashierCoin(coin) {
    // 1. Données des adresses (identiques à deposit.js pour la cohérence)
    const cashierData = {
        btc: { name: "Bitcoin (BTC)", addr: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", net: "Bitcoin" },
        eth: { name: "Ethereum (ETH)", addr: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", net: "Ethereum (ERC20)" },
        usdt: { name: "Tether (USDT)", addr: "TX89zPQm78999999999999999999999", net: "Tether (TRC20)" }
    };

    const info = cashierData[coin];

    // 2. Mise à jour du texte et de l'adresse
    document.getElementById('cashier-coin-name').innerText = info.name;
    document.getElementById('btc-address-cashier').value = info.addr;
    document.getElementById('cashier-network-warning').innerHTML = `Réseau : <strong>${info.net}</strong>`;

    // 3. Gestion visuelle des boutons
    document.querySelectorAll('.coin-item-mini').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-coin') === coin) {
            btn.classList.add('active');
        }
    });
}



function updateWithdrawCoin(coin) {
    const withdrawData = {
        btc: { name: "Bitcoin", net: "Bitcoin" },
        eth: { name: "Ethereum", net: "Ethereum (ERC20)" },
        usdt: { name: "Tether (USDT)", net: "Tether (TRC20)" }
    };

    const info = withdrawData[coin];

    // Mise à jour des labels
    document.getElementById('withdraw-coin-name').innerText = info.name;
    document.getElementById('withdraw-network-hint').innerHTML = `Réseau requis : <strong>${info.net}</strong>`;

    // Gestion visuelle des boutons
    document.querySelectorAll('.coin-item-mini-withdraw').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-coin') === coin) {
            btn.classList.add('active');
        }
    });
    
    // On peut aussi changer le placeholder pour aider l'utilisateur
    const addrInput = document.getElementById('withdraw-address');
    if(coin === 'btc') addrInput.placeholder = "Ex: bc1q...";
    else if(coin === 'eth') addrInput.placeholder = "Ex: 0x71...";
    else addrInput.placeholder = "Ex: TX89...";
}



// Gérer la demande de retrait
async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const amount = parseFloat(amountInput.value);
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (!amount || amount < 20) {
        showNotify("Le montant minimum est de 20€", "error");
        return;
    }
    
    if (amount > user.balance) {
        showNotify("Solde insuffisant pour ce retrait", "error");
        return;
    }

    // Simulation de traitement
    showNotify("Demande de retrait de " + amount + "€ envoyée !", "success");
    
    // Optionnel : Déduire le solde immédiatement (ou attendre validation serveur)
    // user.balance -= amount;
    // localStorage.setItem('currentUser', JSON.stringify(user));
    // updateUI();

    closeModal('cashier');
    amountInput.value = ''; // Reset du champ
}








// 2. FONCTION POUR OUVRIR LA MODAL COMPTE
function openAccountModal(tabId = 'profile-tab') {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        if (typeof showNotify === 'function') showNotify("Veuillez vous connecter", "error");
        return;
    }

    const userField = document.getElementById('acc-username');
    const emailField = document.getElementById('acc-email');
    const dateField = document.getElementById('acc-date');

    // On remplit avec les données stockées
    if (userField) userField.value = user.username;
    
    // Si l'email existe dans l'objet user, on l'affiche, sinon on met "Non renseigné"
    if (emailField) {
        emailField.value = user.email ? user.email : "Non renseigné";
    }

    // GESTION DE LA DATE D'INSCRIPTION RÉELLE
    if (dateField) {
        if (user.createdAt) {
            // On transforme la date de la base de données en objet Date JS
            const dateObj = new Date(user.createdAt);
            
            // Formatage pro (ex: 9 janvier 2026)
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const formattedDate = dateObj.toLocaleDateString('fr-FR', options);
            
            dateField.innerText = `Membre depuis le ${formattedDate}`;
        } else {
            // Sécurité si la date est absente pour un vieux compte
            dateField.innerText = "Membre SynthBet";
        }
    }

    // 2 et demi. GESTION De l'avatar actuel
    const avatarImg = document.getElementById('current-avatar');
    if (avatarImg) {
        // On affiche l'avatar enregistré, sinon celui de base "Lucky"
        avatarImg.src = user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky";
    }

    // Affichage de la modal
    const modal = document.getElementById('accountModal');
    if (modal) modal.style.display = 'flex';

    // Activation de l'onglet
    const btn = document.querySelector(`button[onclick*='${tabId}']`);
    if (btn) switchTab({ currentTarget: btn }, tabId);
}




// 1. FONCTION POUR CHANGER D'ONGLET
function switchTab(evt, tabId) {
    // Masquer tous les contenus d'onglets
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));

    // Désactiver tous les boutons d'onglets
    const btns = document.querySelectorAll(".tab-btn");
    btns.forEach(btn => btn.classList.remove("active"));

    // Afficher l'onglet actuel et ajouter la classe active au bouton
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");

    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    }
}



function showNotify(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notify = document.createElement('div');
    
    // On définit l'icône automatiquement
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const accentColor = type === 'success' ? '#10b981' : '#f87171';

    // On applique la classe de base et le type (success ou error)
    notify.className = `notification ${type}`;

    notify.innerHTML = `
        <i class="fas ${icon}" style="color: ${accentColor}; font-size: 1.1rem;"></i> 
        <span style="letter-spacing: 0.3px;">${message}</span>
    `;
    
    container.appendChild(notify);

    // Animation d'entrée : on ajoute la classe 'show' au prochain tick
    requestAnimationFrame(() => {
        notify.classList.add('show');
    });

    // Suppression automatique
    setTimeout(() => {
        // Animation de sortie vers la gauche
        notify.classList.remove('show');
        notify.style.opacity = '0';
        
        // On attend la fin de l'animation pour supprimer l'élément du DOM
        setTimeout(() => notify.remove(), 600);
    }, 3500);
}


// 1. Gérer le masquage du solde
function toggleBalancePrivacy() {
    // 1. On récupère l'état du switch
    const isHidden = document.getElementById('hideBalanceToggle').checked;
    
    // 2. On enregistre dans le localStorage (attention au nom de la clé : 'hideBalance')
    localStorage.setItem('hideBalance', isHidden);
    
    // 3. On demande à l'interface de se redessiner
    updateUI();
    
    // 4. Notification
    showNotify(isHidden ? "Solde masqué" : "Solde visible", "success");
}

// 2. Envoyer la demande de changement de mot de passe
async function handlePasswordUpdate() {
    const oldPassword = document.getElementById('old-pass').value;
    const newPassword = document.getElementById('new-pass').value;
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if(!oldPassword || !newPassword) {
        showNotify("Veuillez remplir tous les champs", "error");
        return;
    }

    if (newPassword.length < 8) {
        showNotify("Le nouveau mot de passe doit faire au moins 8 caractères", "error");
        return;
    }

    try {
        const response = await fetch('https://anasspin-github-io.onrender.com/api/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id || user.id, oldPassword, newPassword })
        });

        const result = await response.json();
        if (response.ok) {
            showNotify(result.message, "success");
            document.getElementById('old-pass').value = '';
            document.getElementById('new-pass').value = '';
        } else {
            showNotify(result.message, "error");
        }
    } catch (err) {
        showNotify("Erreur serveur", "error");
    }
}

// Fonction pour vérifier l'authentification avant d'accéder aux jeux
function checkAuth(event) {
    const user = localStorage.getItem('currentUser');
    
    // Si l'utilisateur n'est pas connecté
    if (!user) {
        event.preventDefault(); // Empêche de suivre le lien ou de recharger la page
        openModal('login');    // Ouvre directement la fenêtre de connexion
        showNotify("Veuillez vous connecter pour jouer", "error");
    }
}




function updateLiveCounters() {
    const badges = document.querySelectorAll('.live-badge');
    badges.forEach(badge => {
        // On récupère le nombre actuel dans le texte
        let currentText = badge.innerText.replace(/\s/g, '').match(/\d+/);
        if (currentText) {
            let count = parseInt(currentText[0]);
            // On ajoute ou retire entre 1 et 5 joueurs
            let change = Math.floor(Math.random() * 11) - 5; 
            let newCount = Math.max(10, count + change);
            
            badge.innerHTML = `<span class="live-dot"></span> ${newCount.toLocaleString()} JOUANT`;
        }
    });
}


function scrollPopulaires(direction) {
    const slider = document.getElementById('popSlider');
    // On définit de combien de pixels on défile à chaque clic
    const scrollAmount = 240; 
    
    slider.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

function scrollArcade(direction) {
    const slider = document.getElementById('arcadeSlider');
    // On calcule la largeur d'une carte + le gap pour un défilement précis
    const scrollAmount = 260; 
    
    slider.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

// Mise à jour toutes les 5 secondes
setInterval(updateLiveCounters, 5000);






// --- INITIALISATION AU CHARGEMENT ---
function init() {
    console.log("Initialisation de l'interface...");
    updateUI();
}

// On écoute le chargement du DOM ET le chargement complet de la fenêtre
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('pageshow', (event) => {
    // 'pageshow' est crucial pour mobile : il se déclenche même si l'utilisateur 
    // revient en arrière ou utilise une version cachée de la page.
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        updateUI();
    }
});