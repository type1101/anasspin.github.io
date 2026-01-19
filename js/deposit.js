/**
 * NEO SPIN - DEPOSIT ENGINE (CORRIGÉ)
 */

let cryptoData = {}; 
let activeRate = 0;
let currentCoin = 'btc';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. SÉLECTION DES ÉLÉMENTS (On les définit une seule fois ici)
    const tabs = document.querySelectorAll('.coin-item');
    const euroInput = document.getElementById('euroAmount');
    const cryptoToView = document.getElementById('cryptoToView');
    const valTotal = document.getElementById('valTotal');
    const valEurHidden = document.getElementById('valEur');
    const network = document.getElementById('networkName');
    const btcAddress = document.getElementById('btcAddress');
    const confirmBtn = document.getElementById('confirmDepositBtn');
    const statusBox = document.getElementById('depositStatus');

    // 2. CHARGEMENT DES CONFIGURATIONS SERVEUR
    try {
        const configRes = await fetch('/api/config/wallets');
        const configData = await configRes.json();
        
        cryptoData = {
            btc: { ...configData.btc, rate: 42000 },
            eth: { ...configData.eth, rate: 2200 },
            usdt: { ...configData.usdt, rate: 1 }
        };

        // Initialisation par défaut
        activeRate = cryptoData.btc.rate;
        btcAddress.value = cryptoData.btc.addr;
        network.innerText = cryptoData.btc.net;
        
        fetchPrices(); // Lancer la mise à jour des prix
    } catch (err) {
        console.error("Erreur de chargement des adresses");
    }

    // 3. FONCTION DE RÉCUPÉRATION DES PRIX (Proxy Serveur)
    async function fetchPrices() {
        try {
            const response = await fetch('/api/prices');
            const prices = await response.json();

            const btc = prices.find(p => p.symbol === "BTCEUR");
            const eth = prices.find(p => p.symbol === "ETHEUR");
            const usdt = prices.find(p => p.symbol === "EURUSDT");

            if (btc) cryptoData.btc.rate = parseFloat(btc.price);
            if (eth) cryptoData.eth.rate = parseFloat(eth.price);
            if (usdt) cryptoData.usdt.rate = 1 / parseFloat(usdt.price);

            activeRate = cryptoData[currentCoin].rate;
            calculate(); 
        } catch (error) {
            console.error("Erreur prix API :", error);
        }
    }

    // 4. FONCTION DE CALCUL
    function calculate() {
        if (!euroInput) return;
        const amountEur = parseFloat(euroInput.value) || 0;
        const cryptoNeeded = amountEur / activeRate;
        
        if (cryptoToView) cryptoToView.innerText = cryptoNeeded.toFixed(currentCoin === 'usdt' ? 2 : 8);
        
        const total = amountEur * 2;
        if (valTotal) {
            valTotal.innerText = total.toLocaleString('fr-FR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
        }
        if (valEurHidden) valEurHidden.innerText = amountEur.toString();
    }

    // 5. GESTION DES ONGLETS (CHANGEMENT DE CRYPTO)
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            currentCoin = tab.dataset.coin;
            const info = cryptoData[currentCoin];
            
            activeRate = info.rate;
            btcAddress.value = info.addr;
            network.innerText = info.net;
            
            document.getElementById('activeCoin').innerText = currentCoin.toUpperCase();
            document.getElementById('coinWarning').innerText = currentCoin.toUpperCase();
            
            calculate();
        });
    });

    // 6. ÉCOUTEURS D'ÉVÉNEMENTS
    if (euroInput) euroInput.addEventListener('input', calculate);

    // Bouton Copier
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(btcAddress.value).then(() => {
                const originalIcon = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 2000);
            });
        });
    }

    // 7. GESTION DU BOUTON DE CONFIRMATION
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const amount = parseFloat(valEurHidden.innerText);

            if (!user || !user._id) {
                showNotify("Veuillez vous connecter", "error");
                return;
            }

            confirmBtn.style.display = 'none';
            statusBox.style.display = 'block';

            try {
                const response = await fetch('/api/deposit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user._id,
                        amountEur: amount
                    })
                });

                if (!response.ok) throw new Error();

                // Simulation Blockchain
                let seconds = 0;
                const interval = setInterval(() => {
                    seconds++;
                    const statusText = document.querySelector('.status-text');
                    if(seconds === 5 && statusText) statusText.innerText = "Transaction détectée... (2/3)";
                    if(seconds === 15) {
                        clearInterval(interval);
                        statusBox.innerHTML = `<p style="color:#00e701;">Dépôt de ${amount * 2}€ validé !</p>`;
                        user.balance += (amount * 2);
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        if(typeof updateUI === 'function') updateUI();
                    }
                }, 1000);
            } catch (err) {
                showNotify("Erreur de connexion", "error");
                confirmBtn.style.display = 'block';
                statusBox.style.display = 'none';
            }
        });
    }

    // Lancer le rafraîchissement auto des prix
    setInterval(fetchPrices, 30000);
});