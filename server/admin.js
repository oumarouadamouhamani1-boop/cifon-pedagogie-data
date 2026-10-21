
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

function creerRouteAdmin(pool) {
    const router = express.Router();

    if (!pool) {
        throw new Error("La connexion PostgreSQL est obligatoire.");
    }

    // Vérifier que la configuration secrète existe.
    function verifierConfiguration(req, res, next) {
        if (!process.env.ADMIN_PASSWORD) {
            return res.status(500).json({
                succes: false,
                message: "Le mot de passe administrateur n'est pas configuré."
            });
        }
        next();
    }

    // Créer un jeton de session signé par le serveur.
    function creerSignature(donnees) {
        return crypto
            .createHmac("sha256", process.env.ADMIN_PASSWORD)
            .update(donnees)
            .digest("hex");
    }

    function comparerSignature(a, b) {
        if (
            typeof a !== "string" ||
            typeof b !== "string" ||
            a.length !== b.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(a),
            Buffer.from(b)
        );
    }

    // Vérifier la session administrateur.
    function authentifierAdmin(req, res, next) {
        const session = req.cookies
            ? req.cookies.cifon_admin
            : null;

        if (!session) {
            return res.status(401).json({
                succes: false,
                message: "Connexion administrateur requise."
            });
        }

        const parties = session.split(".");

        if (parties.length !== 3) {
            return res.status(401).json({
                succes: false,
                message: "Session invalide."
            });
        }

        const expiration = parties[0];
        const nonce = parties[1];
        const signature = parties[2];
        const donnees = expiration + "." + nonce;
        const signatureAttendue = creerSignature(donnees);

        if (
            !/^\d+$/.test(expiration) ||
            Date.now() > Number(expiration) ||
            !comparerSignature(signature, signatureAttendue)
        ) {
            return res.status(401).json({
                succes: false,
                message: "Session expirée ou invalide."
            });
        }

        next();
    }

    // Page d'accueil de l'administration.
    router.get("/admin", (req, res) => {
        res.sendFile(
            require("path").join(__dirname, "admin.html")
        );
    });

    // Connexion administrateur.
    router.post(
        "/api/admin/login",
        verifierConfiguration,
        express.json(),
        (req, res) => {
            const motDePasse = req.body
                ? req.body.motDePasse
                : null;

            if (typeof motDePasse !== "string") {
                return res.status(400).json({
                    succes: false,
                    message: "Mot de passe obligatoire."
                });
            }

            const secret = process.env.ADMIN_PASSWORD;

            const motDePasseCorrect =
                Buffer.byteLength(motDePasse) ===
                    Buffer.byteLength(secret) &&
                crypto.timingSafeEqual(
                    Buffer.from(motDePasse),
                    Buffer.from(secret)
                );

            if (!motDePasseCorrect) {
                return res.status(401).json({
                    succes: false,
                    message: "Mot de passe incorrect."
                });
            }

            const expiration =
                String(Date.now() + 2 * 60 * 60 * 1000);

            const nonce = crypto
                .randomBytes(24)
                .toString("hex");

            const donnees = expiration + "." + nonce;
            const signature = creerSignature(donnees);
            const session =
                donnees + "." + signature;

            res.cookie("cifon_admin", session, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 2 * 60 * 60 * 1000,
                path: "/"
            });

            return res.json({
                succes: true,
                message: "Connexion administrateur réussie."
            });
        }
    );

    // Déconnexion administrateur.
    router.post(
        "/api/admin/logout",
        authentifierAdmin,
        (req, res) => {
            res.clearCookie("cifon_admin", {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                path: "/"
            });

            res.json({
                succes: true,
                message: "Déconnexion réussie."
            });
        }
    );

    // Générer un code d'accès unique.
    router.post(
        "/api/admin/codes",
        authentifierAdmin,
        express.json(),
        async (req, res) => {
            try {
                const dureeJours = Number(
                    req.body && req.body.dureeJours
                );

                if (![30, 60, 90].includes(dureeJours)) {
                    return res.status(400).json({
                        succes: false,
                        message:
                            "Choisis une durée de 30, 60 ou 90 jours."
                    });
                }

                // Le code brut ne sera jamais enregistré en base.
                const code =
                    crypto.randomBytes(8).toString("hex")
                        .toUpperCase();

                const codeHash = await bcrypt.hash(code, 12);

                await pool.query(
                    `CREATE TABLE IF NOT EXISTS codes_acces (
                        id BIGSERIAL PRIMARY KEY,
                        code_hash TEXT NOT NULL UNIQUE,
                        statut VARCHAR(20) NOT NULL DEFAULT 'disponible'
                            CHECK (statut IN (
                                'disponible',
                                'utilise',
                                'suspendu',
                                'expire'
                            )),
                        duree_jours INTEGER NOT NULL
                            CHECK (duree_jours IN (30, 60, 90)),
                        utilisateur_id BIGINT,
                        cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        active_le TIMESTAMPTZ,
                        date_expiration TIMESTAMPTZ
                    )`
                );

                await pool.query(
                    `INSERT INTO codes_acces
                        (code_hash, duree_jours)
                     VALUES ($1, $2)`,
                    [codeHash, dureeJours]
                );

                return res.json({
                    succes: true,
                    code: code,
                    dureeJours: dureeJours,
                    message:
                        "Code créé. Copie-le et envoie-le au testeur."
                });

            } catch (erreur) {
                console.error(
                    "Erreur génération code administrateur :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message: "Impossible de générer le code."
                });
            }
        }
    );

    // Afficher les codes sans révéler les codes secrets.
    router.get(
        "/api/admin/codes",
        authentifierAdmin,
        async (req, res) => {
            try {
                const resultat = await pool.query(
                    `SELECT id, statut, duree_jours,
                            utilisateur_id, cree_le,
                            active_le, date_expiration
                     FROM codes_acces
                     ORDER BY cree_le DESC
                     LIMIT 200`
                );

                res.json({
                    succes: true,
                    codes: resultat.rows
                });

            } catch (erreur) {
                console.error(
                    "Erreur lecture des codes :",
                    erreur.message
                );

                res.status(500).json({
                    succes: false,
                    message: "Impossible de lire les codes."
                });
            }
        }
    );

        // ============================================================
    // COMPTER LES UTILISATEURS — ADMINISTRATION CIFON
    // ============================================================

    router.get(
        "/api/admin/utilisateurs/nombre",
        authentifierAdmin,
        async (req, res) => {
            try {
                const resultat = await pool.query(
                    "SELECT COUNT(*) AS nombre FROM utilisateurs"
                );

                return res.json({
                    succes: true,
                    nombreUtilisateurs: Number(
                        resultat.rows[0].nombre
                    ),
                    message:
                        "Nombre de comptes utilisateurs récupéré."
                });

            } catch (erreur) {
                console.error(
                    "Erreur comptage utilisateurs :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message:
                        "Impossible de compter les utilisateurs."
                });
            }
        }
    );

    return router;
}

module.exports = creerRouteAdmin;
