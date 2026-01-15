const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb'); // Ajout de ObjectId pour trouver l'utilisateur
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const WALLET_CONFIG = {
    btc: { addr: "TON_ADRESSE_BITCOIN", net: "Bitcoin" },
    eth: { addr: "TON_ADRESSE_ETH", net: "Ethereum (ERC20)" },
    usdt: { addr: "TON_ADRESSE_USDT", net: "Tether (TRC20)" }
};

//une route pour récupérer la config en toute sécurité ehehhe
app.get('/api/config/wallets', (req, res) => {
    res.json(WALLET_CONFIG);
});

async function startServer() {
    try {
        await client.connect();
        console.log("✅ Connecté à la base de données MongoDB");
        
        const db = client.db("neospin");
        const users = db.collection("users");

        // --- ROUTE D'INSCRIPTION ---
        app.post('/register', async (req, res) => {
            try {
                const { username, email, password } = req.body;
                

                // --- NOUVELLE VÉRIFICATION DE SÉCURITÉ ---
                if (!password || password.length < 8) {
                    return res.status(400).json({ 
                        message: "Le mot de passe doit contenir au moins 8 caractères." 
                    });
                }
                // -----------------------------------------
                const db = client.db("neospin"); 
                const users = db.collection("users");


                const existingUser = await users.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: "Cet email est déjà utilisé." });
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                const newUser = {
                    username,
                    email,
                    password: hashedPassword,
                    balance: 0,
                    avatar : "",
                    createdAt: new Date()
                };
                const result = await users.insertOne(newUser);

                        // ON RENVOIE L'OBJET USER COMPLET
                        // C'est ce qui permettra à openAccountModal d'afficher la vraie date
                res.status(201).json({ 
                    message: "Compte créé avec succès !",
                    user: {
                        _id: result.insertedId,
                        username: newUser.username,
                        email: newUser.email,
                        balance: newUser.balance,
                        avatar: newUser.avatar,
                        createdAt: newUser.createdAt
                    }
                });
            } catch (error) {
                res.status(500).json({ message: "Erreur lors de l'inscription." });
            }
        });



        // LA ROUTE POUR L'UPDATEEE DE AVAATTAAAAR
    app.post('/api/update-avatar', async (req, res) => {
        try {
            const { userId, avatarUrl } = req.body;
            const db = client.db("neospin");
            const users = db.collection("users");

            await users.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { avatar: avatarUrl } }
            );

            res.status(200).json({ message: "Avatar mis à jour !", avatar: avatarUrl });
        } catch (error) {
            res.status(500).json({ message: "Erreur lors de la mise à jour de l'avatar." });
        }
    });






        // --- ROUTE DE CONNEXION ---
        app.post('/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await users.findOne({ email });
                if (!user) return res.status(400).json({ message: "Utilisateur non trouvé." });

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect." });

                res.status(200).json({ 
                    message: "Connexion réussie !", 
                    user: { 
                        _id: user._id, // Très important pour le dépôt !
                        email: user.email,
                        username: user.username, 
                        balance: user.balance,
                        createdAt: user.createdAt
                    } 
                });
            } catch (error) {
                res.status(500).json({ message: "Erreur lors de la connexion." });
            }
        });

        // --- NOUVELLE ROUTE : DÉPÔT (SIMULÉ) ---
        app.post('/api/deposit', async (req, res) => {
            try {
                const { userId, amountEur } = req.body;

                if (!userId) return res.status(400).json({ message: "ID utilisateur manquant." });

                // 1. On répond tout de suite au client que c'est en cours
                res.json({ message: "Dépôt en cours de vérification..." });

                // 2. On attend 15 secondes (simulation blockchain)
                setTimeout(async () => {
                    const totalAdd = parseFloat(amountEur) * 2; // Montant + Bonus 100%

                    // 3. Mise à jour réelle dans MongoDB
                    await users.updateOne(
                        { _id: new ObjectId(userId) },
                        { $inc: { balance: totalAdd } } // $inc augmente la valeur existante
                    );

                    console.log(`✅ MongoDB mis à jour : +${totalAdd}€ pour l'ID ${userId}`);
                }, 15000);

            } catch (error) {
                console.error("Erreur dépôt:", error);
                res.status(500).json({ error: error.message });
            }
        });


        // --- DANS LA FONCTION startServer, après la route deposit ---

    app.post('/api/update-password', async (req, res) => {
        try {
            const { userId, oldPassword, newPassword } = req.body;

            if (!userId) return res.status(400).json({ message: "ID utilisateur manquant." });

            // 1. Chercher l'utilisateur dans MongoDB Atlas
            const user = await users.findOne({ _id: new ObjectId(userId) });

            if (!user) {
                return res.status(404).json({ message: "Utilisateur introuvable." });
            }

            // 2. Vérification de l'ancien mot de passe avec bcrypt
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "L'ancien mot de passe est incorrect." });
            }

            // 3. Hashage du nouveau mot de passe et mise à jour
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            
            await users.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { password: hashedNewPassword } }
            );
            
            console.log(`✅ Mot de passe mis à jour pour : ${user.username}`);
            res.status(200).json({ message: "Mot de passe mis à jour avec succès !" });

        } catch (error) {
            console.error("ERREUR SERVEUR UPDATE-PASS:", error);
            res.status(500).json({ message: "Erreur lors de la mise à jour." });
        }
    });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`🚀 Serveur actif sur http://localhost:${PORT}`));

    } catch (err) {
        console.error("❌ Erreur de connexion MongoDB:", err);
    }
}







startServer();