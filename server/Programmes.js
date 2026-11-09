
"use strict";

const express = require("express");

const {
  S3Client,
  HeadBucketCommand
} = require("@aws-sdk/client-s3");

function creerRoutesProgrammes(pool) {
  const router = express.Router();

  const variablesR2 = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME"
  ];

  const r2Configure = variablesR2.every(
    nom => Boolean(process.env[nom]?.trim())
  );

  const r2 = r2Configure
    ? new S3Client({
        region: "auto",
        endpoint:
          "https://" +
          process.env.R2_ACCOUNT_ID +
          ".r2.cloudflarestorage.com",
        credentials: {
          accessKeyId:
            process.env.R2_ACCESS_KEY_ID,
          secretAccessKey:
            process.env.R2_SECRET_ACCESS_KEY
        }
      })
    : null;

  async function verifierStockage() {
    if (!r2) {
      console.error(
        "CIFON Programmes : configuration R2 absente."
      );
      return false;
    }

    try {
      await r2.send(
        new HeadBucketCommand({
          Bucket: process.env.R2_BUCKET_NAME
        })
      );

      console.log(
        "CIFON Programmes : connexion R2 réussie."
      );

      return true;
    } catch (erreur) {
      console.error(
        "CIFON Programmes : connexion R2 échouée :",
        erreur.message
      );

      return false;
    }
  }

  // Vérification interne au démarrage.
  verifierStockage().catch(erreur => {
    console.error(
      "CIFON Programmes : erreur de vérification :",
      erreur.message
    );
  });

  return router;
}

module.exports = creerRoutesProgrammes;
