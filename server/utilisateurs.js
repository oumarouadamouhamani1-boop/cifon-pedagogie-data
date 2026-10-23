
"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

module.exports = function creerRouteUtilisateurs(pool) {
  const router = express.Router();

  // Inscription
  router.post("/api/utilisateurs/inscription", async (req, res) => {
    try {
      if (!pool) {
        return res.status(503).json({
          succes: false,
          message: "Base de données indisponible."
        });
      }

      const telephone = String(req.body?.telephone || "")
        .trim()
        .replace(/[\s().-]/g, "");

      const motDePasse = String(req.body?.motDePasse || "");

      if (!/^\+?[0-9]{8,15}$/.test(telephone)) {
        return res.status(400).json({
          succes: false,
          message: "Vérifiez votre numéro de téléphone."
        });
      }

      if (motDePasse.length < 8 || motDePasse.length > 128) {
        return res.status(400).json({
          succes: false,
          message: "Le mot de passe doit contenir entre 8 et 128 caractères."
        });
      }

      const hash = await bcrypt.hash(motDePasse, 12);

      const resultat = await pool.query(
        `INSERT INTO utilisateurs
          (telephone, mot_de_passe_hash, statut, role)
         VALUES ($1, $2, 'actif', 'testeur')
         RETURNING id, telephone, role, statut, cree_le`,
        [telephone, hash]
      );

      return res.status(201).json({
        succes: true,
        message: "Compte créé. Vous pouvez maintenant vous connecter.",
        utilisateur: resultat.rows[0]
      });
    } catch (erreur) {
      if (erreur.code === "23505") {
        return res.status(409).json({
          succes: false,
          message: "Ce numéro possède déjà un compte."
        });
      }

      console.error("Erreur inscription :", erreur.message);
      return res.status(500).json({
        succes: false,
        message: "Impossible de créer le compte."
      });
    }
  });

  // Connexion avec création d'une session de 30 jours
  router.post("/api/utilisateurs/connexion", async (req, res) => {
    try {
      if (!pool) {
        return res.status(503).json({
          succes: false,
          message: "Base de données indisponible."
        });
      }

      const telephone = String(req.body?.telephone || "")
        .trim()
        .replace(/[\s().-]/g, "");

      const motDePasse = String(req.body?.motDePasse || "");

      const resultat = await pool.query(
        `SELECT id, telephone, mot_de_passe_hash,
                role, statut, date_expiration
         FROM utilisateurs
         WHERE telephone = $1`,
        [telephone]
      );

      if (resultat.rows.length === 0) {
        return res.status(401).json({
          succes: false,
          message: "Numéro ou mot de passe incorrect."
        });
      }

      const utilisateur = resultat.rows[0];

      const valide = await bcrypt.compare(
        motDePasse,
        utilisateur.mot_de_passe_hash
      );

      if (!valide) {
        return res.status(401).json({
          succes: false,
          message: "Numéro ou mot de passe incorrect."
        });
      }

      if (utilisateur.statut === "suspendu") {
        return res.status(403).json({
          succes: false,
          message: "Ce compte est suspendu."
        });
      }

      // Créer un jeton aléatoire imprévisible.
      const jeton = crypto.randomBytes(32).toString("hex");
      const jetonHash = crypto
        .createHash("sha256")
        .update(jeton)
        .digest("hex");

      const expireLe = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );

      await pool.query(
        `INSERT INTO sessions_utilisateurs
          (utilisateur_id, jeton_hash, expire_le)
         VALUES ($1, $2, $3)`,
        [utilisateur.id, jetonHash, expireLe]
      );

      return res.json({
        succes: true,
        message: "Connexion réussie.",
        jeton: jeton,
        typeJeton: "Bearer",
        expireLe: expireLe.toISOString(),
        utilisateur: {
          id: utilisateur.id,
          telephone: utilisateur.telephone,
          role: utilisateur.role,
          statut: utilisateur.statut,
          dateExpiration: utilisateur.date_expiration
        }
      });
    } catch (erreur) {
      console.error("Erreur connexion :", erreur.message);
      return res.status(500).json({
        succes: false,
        message: "Impossible de se connecter pour le moment."
      });
    }
  });

  // Vérifier la session de l'utilisateur connecté
  router.get("/api/utilisateurs/moi", async (req, res) => {
    try {
      const autorisation = req.headers.authorization || "";
      const correspondance = autorisation.match(/^Bearer\s+([a-f0-9]{64})$/i);

      if (!correspondance) {
        return res.status(401).json({
          succes: false,
          message: "Jeton de connexion manquant ou invalide."
        });
      }

      const jetonHash = crypto
        .createHash("sha256")
        .update(correspondance[1])
        .digest("hex");

      const resultat = await pool.query(
        `SELECT u.id, u.telephone, u.role, u.statut,
                u.date_expiration
         FROM sessions_utilisateurs s
         JOIN utilisateurs u ON u.id = s.utilisateur_id
         WHERE s.jeton_hash = $1
           AND s.expire_le > NOW()
           AND u.statut = 'actif'`,
        [jetonHash]
      );

      if (resultat.rows.length === 0) {
        return res.status(401).json({
          succes: false,
          message: "Session expirée ou invalide."
        });
      }

      return res.json({
        succes: true,
        utilisateur: resultat.rows[0]
      });
    } catch (erreur) {
      console.error("Erreur vérification session :", erreur.message);
      return res.status(500).json({
        succes: false,
        message: "Impossible de vérifier la session."
      });
    }
  });

  // Déconnexion : révoquer le jeton courant
  router.post("/api/utilisateurs/deconnexion", async (req, res) => {
    try {
      const autorisation = req.headers.authorization || "";
      const correspondance = autorisation.match(/^Bearer\s+([a-f0-9]{64})$/i);

      if (!correspondance) {
        return res.status(401).json({
          succes: false,
          message: "Jeton de connexion manquant ou invalide."
        });
      }

      const jetonHash = crypto
        .createHash("sha256")
        .update(correspondance[1])
        .digest("hex");

      await pool.query(
        "DELETE FROM sessions_utilisateurs WHERE jeton_hash = $1",
        [jetonHash]
      );

      return res.json({
        succes: true,
        message: "Déconnexion réussie."
      });
    } catch (erreur) {
      console.error("Erreur déconnexion :", erreur.message);
      return res.status(500).json({
        succes: false,
        message: "Impossible de se déconnecter."
      });
    }
  });

  return router;
};
