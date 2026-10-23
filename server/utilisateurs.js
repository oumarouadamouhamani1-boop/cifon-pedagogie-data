
"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

module.exports = function creerRouteUtilisateurs(pool) {
  const router = express.Router();

  // Création d'un compte utilisateur
  router.post("/api/utilisateurs/inscription", async (req, res) => {
    try {
      if (!pool) {
        return res.status(503).json({
          succes: false,
          message: "Base de données indisponible."
        });
      }

      const telephone = String(req.body.telephone || "")
        .trim()
        .replace(/[\s().-]/g, "");

      const motDePasse = String(req.body.motDePasse || "");

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

      const recherche = await pool.query(
        "SELECT id FROM utilisateurs WHERE telephone = $1",
        [telephone]
      );

      if (recherche.rows.length > 0) {
        return res.status(409).json({
          succes: false,
          message: "Ce numéro possède déjà un compte."
        });
      }

      const motDePasseHash = await bcrypt.hash(motDePasse, 12);

      const resultat = await pool.query(
        `INSERT INTO utilisateurs
          (telephone, mot_de_passe_hash, statut, role)
         VALUES ($1, $2, 'actif', 'testeur')
         RETURNING id, telephone, role, statut, cree_le`,
        [telephone, motDePasseHash]
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
        message: "Impossible de créer le compte pour le moment."
      });
    }
  });

  // Connexion d'un utilisateur
  router.post("/api/utilisateurs/connexion", async (req, res) => {
    try {
      if (!pool) {
        return res.status(503).json({
          succes: false,
          message: "Base de données indisponible."
        });
      }

      const telephone = String(req.body.telephone || "")
        .trim()
        .replace(/[\s().-]/g, "");

      const motDePasse = String(req.body.motDePasse || "");

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

      // Réponse sans le hash du mot de passe
      return res.json({
        succes: true,
        message: "Connexion réussie.",
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

  return router;
};

