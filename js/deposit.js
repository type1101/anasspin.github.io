document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.coin-item');
    const euroInput = document.getElementById('euroAmount'); // Changé
    const cryptoToView = document.getElementById('cryptoToView'); // Nouveau
    const valTotal = document.getElementById('valTotal'); // Nouveau
    const valEurHidden = document.getElementById('valEur'); // Pour la compatibilité
    const network = document.getElementById('networkName');
    const btcAddress = document.getElementById('btcAddress');
    
    // Configuration des données et adresses
    const cryptoData = {
        btc: { addr: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", net: "Bitcoin", symbol: "BTCEUR", rate: 42000 },
        eth: { addr: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", net: "Ethereum (ERC20)", symbol: "ETHEUR", rate: 2200 },
        usdt: { addr: "TX89zPQm78999999999999999999999", net: "Tether (TRC20)", symbol: "EURUSDT", rate: 0.93 }
    };

    let activeRate = cryptoData.btc.rate;
    let currentCoin = 'btc';

    // 1. RÉCUPÉRATION DES PRIX RÉELS VIA BINANCE
    async function fetchPrices() {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price');
            const prices = await response.json();

            // Extraction et mise à jour des taux
            const btc = prices.find(p => p.symbol === "BTCEUR");
            const eth = prices.find(p => p.symbol === "ETHEUR");
            const usdt = prices.find(p => p.symbol === "EURUSDT");

            if (btc) cryptoData.btc.rate = parseFloat(btc.price);
            if (eth) cryptoData.eth.rate = parseFloat(eth.price);
            if (usdt) cryptoData.usdt.rate = 1 / parseFloat(usdt.price); // On veut le prix d'1 USDT en EUR

            // Met à jour le taux de la monnaie actuellement sélectionnée
            activeRate = cryptoData[currentCoin].rate;
            calculate(); 
            console.log("Cours du marché actualisés");
        } catch (error) {
            console.error("Erreur API :", error);
        }
    }

    // 2. CALCULATEUR DE CONVERSION
    function calculate() {
        const amountEur = parseFloat(euroInput.value) || 0;
        
        // Calcul du montant crypto nécessaire
        const cryptoNeeded = amountEur / activeRate;
        
        // Affichage de la crypto avec précision (8 décimales pour BTC/ETH)
        cryptoToView.innerText = cryptoNeeded.toFixed(currentCoin === 'usdt' ? 2 : 8);
        
        // Affichage du total crédité (Montant + Bonus 100%)
        const total = amountEur * 2;
        valTotal.innerText = total.toLocaleString('fr-FR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });

        // Mise à jour de l'ID caché pour le bouton de confirmation
        valEurHidden.innerText = amountEur.toString();
    }

    // 3. GESTION DU CHANGEMENT DE CRYPTO
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            currentCoin = tab.dataset.coin;
            const info = cryptoData[currentCoin];
            
            activeRate = info.rate;
            btcAddress.value = info.addr;
            network.innerText = info.net;
            
            // Mise à jour des textes dynamiques
            document.getElementById('activeCoin').innerText = currentCoin.toUpperCase();
            document.getElementById('coinWarning').innerText = currentCoin.toUpperCase();
            
            calculate();
        });
    });

    // 4. ÉCOUTEUR SUR L'INPUT
    euroInput.addEventListener('input', calculate);

    // 5. BOUTON COPIER
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(btcAddress.value).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            copyBtn.style.background = "#fff";
            copyBtn.style.color = "#00e701";
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.style.background = "var(--neon-green)";
                copyBtn.style.color = "#000";
            }, 2000);
        });
    });

    // INITIALISATION
    fetchPrices(); // Premier appel
    setInterval(fetchPrices, 30000); // Rafraîchissement toutes les 30s
});

// Ajoute ce bloc à la fin de ton fichier deposit.js actuel
const confirmBtn = document.getElementById('confirmDepositBtn');
const statusBox = document.getElementById('depositStatus');

confirmBtn.addEventListener('click', async () => {
    // 1. Récupérer l'utilisateur stocké à la connexion
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const amountStr = document.getElementById('valEur').innerText.replace(',', '.');
    const amount = parseFloat(amountStr);

    if (!user || !user._id) {
        showNotify("Erreur : Vous devez être connecté pour déposer.", "error");
        return;
    }

    if (amount <= 0) {
        showNotify("Veuillez entrer un montant valide.", "error");
        return;
    }

    // 2. Interface : On cache le bouton, on montre le chargement
    confirmBtn.style.display = 'none';
    statusBox.style.display = 'block';

    try {
        // 3. Envoyer la requête au serveur (Node.js)
        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user._id,
                amountEur: amount,
                cryptoType: document.getElementById('activeCoin').innerText
            })
        });

        if (!response.ok) throw new Error("Erreur serveur");

        // 4. Simulation visuelle de la blockchain (15 secondes)
        let seconds = 0;
        const interval = setInterval(() => {
            seconds++;
            if(seconds === 5) document.querySelector('.status-text').innerText = "Transaction détectée... En attente de confirmations (1/3)";
            if(seconds === 10) document.querySelector('.status-text').innerText = "Presque terminé... (2/3)";
            
            if(seconds >= 15) {
                clearInterval(interval);
                // Succès final
                statusBox.innerHTML = `
                    <div style="color: var(--neon-green); font-size: 2.5rem; margin-bottom: 10px;"><i class="fas fa-check-circle"></i></div>
                    <p style="color:#fff; font-weight:bold;">Dépôt de ${amount * 2}€ confirmé !</p>
                    <p style="color:#64748b; font-size:0.8rem;">Votre solde a été mis à jour avec le bonus.</p>
                `;
                
                // Mettre à jour le solde localement pour le header
                user.balance += (amount * 2);
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Rafraîchir l'affichage du header (si la fonction existe dans script.js)
                if(typeof updateUI === 'function') updateUI();
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        showNotify("Une erreur est survenue lors de la connexion.", "error");
        confirmBtn.style.display = 'block';
        statusBox.style.display = 'none';
    }
});