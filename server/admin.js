
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
    
    // ============================================================
    // LISTE DES UTILISATEURS — ADMINISTRATION
    // ============================================================

    router.get(
        "/api/admin/utilisateurs",
        authentifierAdmin,
        async (req, res) => {
            try {
                const resultat = await pool.query(
                    `SELECT id, telephone, statut, role,
                            date_expiration
                     FROM utilisateurs
                     ORDER BY id DESC
                     LIMIT 500`
                );

                return res.json({
                    succes: true,
                    utilisateurs: resultat.rows
                });

            } catch (erreur) {
                console.error(
                    "Erreur liste utilisateurs :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message: "Impossible de charger les utilisateurs."
                });
            }
        }
    );

    // ============================================================
    // SUSPENDRE UN UTILISATEUR
    // ============================================================

    router.post(
        "/api/admin/utilisateurs/:id/suspendre",
        authentifierAdmin,
        async (req, res) => {
            const id = req.params.id;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    succes: false,
                    message: "Identifiant utilisateur invalide."
                });
            }

            const client = await pool.connect();

            try {
                await client.query("BEGIN");

                const resultat = await client.query(
                    `UPDATE utilisateurs
                     SET statut = 'suspendu'
                     WHERE id = $1
                       AND role <> 'admin'
                     RETURNING id, telephone, statut, role`,
                    [id]
                );

                if (resultat.rowCount === 0) {
                    await client.query("ROLLBACK");

                    return res.status(404).json({
                        succes: false,
                        message:
                            "Utilisateur introuvable ou compte administrateur protégé."
                    });
                }

                // Invalider les sessions existantes de cet utilisateur.
                await client.query(
                    `DELETE FROM sessions_utilisateurs
                     WHERE utilisateur_id = $1`,
                    [id]
                );

                await client.query("COMMIT");

                return res.json({
                    succes: true,
                    utilisateur: resultat.rows[0],
                    message:
                        "Utilisateur suspendu et sessions invalidées."
                });

            } catch (erreur) {
                await client.query("ROLLBACK");

                console.error(
                    "Erreur suspension utilisateur :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message: "Impossible de suspendre cet utilisateur."
                });

            } finally {
                client.release();
            }
        }
    );

    // ============================================================
    // REACTIVER UN UTILISATEUR
    // ============================================================

    router.post(
        "/api/admin/utilisateurs/:id/reactiver",
        authentifierAdmin,
        async (req, res) => {
            const id = req.params.id;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    succes: false,
                    message: "Identifiant utilisateur invalide."
                });
            }

            try {
                const resultat = await pool.query(
                    `UPDATE utilisateurs
                     SET statut = 'actif'
                     WHERE id = $1
                       AND role <> 'admin'
                     RETURNING id, telephone, statut, role`,
                    [id]
                );

                if (resultat.rowCount === 0) {
                    return res.status(404).json({
                        succes: false,
                        message:
                            "Utilisateur introuvable ou compte administrateur protégé."
                    });
                }

                return res.json({
                    succes: true,
                    utilisateur: resultat.rows[0],
                    message:
                        "Utilisateur réactivé. Il peut se reconnecter."
                });

            } catch (erreur) {
                console.error(
                    "Erreur réactivation utilisateur :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message: "Impossible de réactiver cet utilisateur."
                });
            }
        }
    );
    
    // ============================================================
    // DEMANDES DE VALIDATION DES ENSEIGNANTS
    // ============================================================

    router.get(
        "/api/admin/enseignants/demandes",
        authentifierAdmin,
        async (req, res) => {
            try {
                const resultat = await pool.query(
                    `SELECT
                        id,
                        telephone,
                        type_enseignant,
                        matiere_demandee,
                        validation_pedagogique,
                        statut,
                        cree_le
                     FROM utilisateurs
                     WHERE validation_pedagogique IN (
                        'en_attente',
                        'refusee'
                     )
                     ORDER BY cree_le DESC
                     LIMIT 500`
                );

                return res.json({
                    succes: true,
                    demandes: resultat.rows
                });
            } catch (erreur) {
                console.error(
                    "Erreur lecture demandes enseignants :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message:
                        "Impossible de charger les demandes."
                });
            }
        }
    );

    // ============================================================
    // APPROUVER UNE DEMANDE ENSEIGNANT
    // ============================================================

    router.post(
        "/api/admin/enseignants/:id/approuver",
        authentifierAdmin,
        async (req, res) => {
            const id = req.params.id;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    succes: false,
                    message: "Identifiant invalide."
                });
            }

            try {
                const resultat = await pool.query(
                    `UPDATE utilisateurs
                     SET validation_pedagogique = 'approuve'
                     WHERE id = $1
                       AND role <> 'admin'
                       AND type_enseignant IN (
                           'primaire',
                           'secondaire'
                       )
                       AND validation_pedagogique IN (
                           'en_attente',
                           'refusee'
                       )
                     RETURNING
                       id,
                       telephone,
                       type_enseignant,
                       matiere_demandee,
                       validation_pedagogique`,
                    [id]
                );

                if (resultat.rowCount === 0) {
                    return res.status(404).json({
                        succes: false,
                        message:
                            "Demande introuvable ou déjà traitée."
                    });
                }

                return res.json({
                    succes: true,
                    demande: resultat.rows[0],
                    message:
                        "Profil pédagogique approuvé."
                });
            } catch (erreur) {
                console.error(
                    "Erreur approbation enseignant :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message:
                        "Impossible d'approuver cette demande."
                });
            }
        }
    );

    // ============================================================
    // REFUSER UNE DEMANDE ENSEIGNANT
    // ============================================================

    router.post(
        "/api/admin/enseignants/:id/refuser",
        authentifierAdmin,
        async (req, res) => {
            const id = req.params.id;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    succes: false,
                    message: "Identifiant invalide."
                });
            }

            try {
                const resultat = await pool.query(
                    `UPDATE utilisateurs
                     SET validation_pedagogique = 'refusee'
                     WHERE id = $1
                       AND role <> 'admin'
                       AND type_enseignant IN (
                           'primaire',
                           'secondaire'
                       )
                       AND validation_pedagogique IN (
                           'en_attente',
                           'refusee'
                       )
                     RETURNING
                       id,
                       telephone,
                       type_enseignant,
                       matiere_demandee,
                       validation_pedagogique`,
                    [id]
                );

                if (resultat.rowCount === 0) {
                    return res.status(404).json({
                        succes: false,
                        message:
                            "Demande introuvable ou déjà traitée."
                    });
                }

                return res.json({
                    succes: true,
                    demande: resultat.rows[0],
                    message:
                        "Demande refusée. Elle pourra être réexaminée."
                });
            } catch (erreur) {
                console.error(
                    "Erreur refus enseignant :",
                    erreur.message
                );

                return res.status(500).json({
                    succes: false,
                    message:
                        "Impossible de refuser cette demande."
                });
            }
        }
    );



    return router;
}

module.exports = creerRouteAdmin;
