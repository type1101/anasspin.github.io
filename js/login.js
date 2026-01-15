// utilise plus


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('loginEmail');
            const passInput = document.getElementById('loginPass') || document.getElementById('loginPassword');

            const email = emailInput.value;
            const password = passInput.value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));

                    // ✅ REMPLACÉ : Plus d'alerte système "éclatée"
                    if (typeof showNotify === 'function') {
                        showNotify("Connexion réussie ! Content de vous revoir.", 'success');
                    }

                    setTimeout(() => {
                        window.location.href = 'index.html'; 
                    }, 1000);
                } else {
                    // ❌ REMPLACÉ : Notification d'erreur stylisée
                    if (typeof showNotify === 'function') {
                        showNotify(data.message, 'error');
                    }
                }
            } catch (error) {
                console.error("Erreur connexion :", error);
                if (typeof showNotify === 'function') {
                    showNotify("Impossible de contacter le serveur.", 'error');
                }
            }
        });
    }
});