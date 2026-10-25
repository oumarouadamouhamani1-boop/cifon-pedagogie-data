"use strict";

const express = require("express");
const cookieParser = require("cookie-parser");
const OpenAI = require("openai");
const { Pool } = require("pg");
const creerRouteAdmin = require("./admin");
const creerRouteUtilisateurs = require("./utilisateurs");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// ============================================================
// CONNEXION POSTGRESQL — CIFON PEDAGOGIE NIGER
// ============================================================

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    })
  : null;
// Routes d'administration CIFON
app.use(creerRouteAdmin(pool));
app.use(creerRouteUtilisateurs(pool));

// Vérification de la connexion sans bloquer le démarrage.
if (pool) {
  pool.query("SELECT NOW()")
    .then(() => {
      console.log("PostgreSQL : connexion réussie.");
    })
    .catch((erreur) => {
      console.error(
        "PostgreSQL : connexion impossible :",
        erreur.message
      );
    });
} else {
  console.error(
    "PostgreSQL : la variable DATABASE_URL est absente."
  );
}
// ============================================================
// INITIALISATION DE LA BASE DES UTILISATEURS
// ============================================================

async function initialiserBaseUtilisateurs() {
  if (!pool) {
    throw new Error(
      "La connexion PostgreSQL n'est pas configurée."
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id BIGSERIAL PRIMARY KEY,

      telephone VARCHAR(30) NOT NULL UNIQUE,

      mot_de_passe_hash TEXT NOT NULL,

      code_acces_hash TEXT UNIQUE,

      statut VARCHAR(20) NOT NULL DEFAULT 'actif'
        CHECK (statut IN ('actif', 'suspendu', 'expire')),

      role VARCHAR(20) NOT NULL DEFAULT 'testeur'
        CHECK (role IN ('admin', 'testeur', 'abonne')),

      date_expiration TIMESTAMPTZ,

      cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      modifie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);  
  // Autoriser les comptes créés sans code d'accès initial.
  await pool.query(`
    ALTER TABLE utilisateurs
    ALTER COLUMN code_acces_hash DROP NOT NULL;
  `);
  
  // Champs du profil pédagogique des enseignants.
  // ADD COLUMN IF NOT EXISTS conserve les données existantes.
  await pool.query(`
    ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS type_enseignant VARCHAR(20);
  `);

  await pool.query(`
    ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS matiere_demandee VARCHAR(80);
  `);

  await pool.query(`
    ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS validation_pedagogique
    VARCHAR(20) NOT NULL DEFAULT 'non_concerne';
  `);

  console.log(
    "PostgreSQL : champs des profils pédagogiques vérifiés."
  );
  
    // Table des sessions sécurisées des utilisateurs.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions_utilisateurs (
      id BIGSERIAL PRIMARY KEY,
      utilisateur_id BIGINT NOT NULL
        REFERENCES utilisateurs(id) ON DELETE CASCADE,
      jeton_hash CHAR(64) NOT NULL UNIQUE,
      expire_le TIMESTAMPTZ NOT NULL,
      cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_sessions_utilisateurs_utilisateur
    ON sessions_utilisateurs(utilisateur_id);
  `);

  console.log("PostgreSQL : table sessions_utilisateurs vérifiée.");

  console.log(
    "PostgreSQL : table utilisateurs vérifiée."
  );
}

// ============================================================
// CIFON PEDAGOGIE NIGER
// SERVEUR CENTRAL DE GENERATION PEDAGOGIQUE
// Version 2.7.0
// ============================================================

const PORT = process.env.PORT || 3000;
const VERSION = "2.7.0";
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================
// OUTILS GENERAUX
// ============================================================

function texte(valeur, defaut = "") {
  if (valeur === null || valeur === undefined) {
    return defaut;
  }

  if (typeof valeur === "string") {
    return valeur.trim() || defaut;
  }

  if (
    typeof valeur === "number" ||
    typeof valeur === "boolean"
  ) {
    return String(valeur);
  }

  return defaut;
}

function extraireObjectifs(source) {
  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          return texte(
            item.texte ||
            item.objectif ||
            item.libelle ||
            item.description,
            ""
          );
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof source === "string") {
    return source
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function extraireRequete(body) {
  const r =
    body && typeof body === "object"
      ? body
      : {};

  const sourcesObjectifs = [
    r.objectifs_selectionnes,
    r.objectifsSelectionnes,
    r.objectifs_specifiques,
    r.objectifs,
    r.selectedObjectives
  ];

  let objectifsSelectionnes = [];

  for (const source of sourcesObjectifs) {
    objectifsSelectionnes = extraireObjectifs(source);

    if (objectifsSelectionnes.length > 0) {
      break;
    }
  }

  return {
    classe: texte(
      r.classe || r.niveau_scolaire,
      "Non précisée"
    ),

    matiere: texte(
      r.matiere || r.discipline,
      "Non précisée"
    ),

    serie: texte(r.serie, ""),

    chapitre: texte(
      r.chapitre ||
      r.lecon ||
      r.titre_lecon ||
      r.titre,
      "À déterminer"
    ),

    theme: texte(r.theme, ""),

    duree: texte(r.duree, "À préciser"),

    niveau: texte(r.niveau, ""),

    type: texte(r.type, ""),

    nombre: Number(r.nombre) || 5,

    objectifsSelectionnes,

    contenuProgramme: texte(
      r.contenu_programme ||
      r.contenuProgramme,
      ""
    ),

    sourceProgramme: texte(
      r.source_programme ||
      r.sourceProgramme,
      ""
    ),

    details: texte(
      r.demande ||
      r.description ||
      r.contenu ||
      r.prompt ||
      r.instruction,
      ""
    )
  };
}

function verifierCleAPI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "La variable OPENAI_API_KEY est absente des variables d'environnement."
    );
  }
}

// ============================================================
// SCHEMA DES FORMES
// ============================================================

const schemaForme = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: [
        "line",
        "triangle",
        "rectangle",
        "circle",
        "cube",
        "text"
      ]
    },
    x1: { type: "number" },
    y1: { type: "number" },
    x2: { type: "number" },
    y2: { type: "number" },
    x3: { type: "number" },
    y3: { type: "number" },
    rayon: { type: "number" },
    label: { type: "string" }
  },
  required: [
    "type",
    "x1",
    "y1",
    "x2",
    "y2",
    "x3",
    "y3",
    "rayon",
    "label"
  ]
};

// ============================================================
// SCHEMA DE LA TRACE STRUCTUREE
// ============================================================

const schemaBlocTrace = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: [
        "heading",
        "subheading",
        "paragraph",
        "list",
        "table",
        "diagram"
      ]
    },
    titre: { type: "string" },
    texte: { type: "string" },
    elements: {
      type: "array",
      items: { type: "string" }
    },
    colonnes: {
      type: "array",
      items: { type: "string" }
    },
    lignes: {
      type: "array",
      items: {
        type: "array",
        items: { type: "string" }
      }
    },
    description: { type: "string" },
    legende: { type: "string" },
    formes: {
      type: "array",
      items: schemaForme
    }
  },
  required: [
    "type",
    "titre",
    "texte",
    "elements",
    "colonnes",
    "lignes",
    "description",
    "legende",
    "formes"
  ]
};

// ============================================================
// SCHEMA DU DEROULEMENT
// ============================================================

const schemaLigneDeroulement = {
  type: "object",
  additionalProperties: false,
  properties: {
    phase: { type: "string" },
    duree: { type: "string" },
    objectif: { type: "string" },
    activites_enseignant: { type: "string" },
    activites_eleves: { type: "string" },
    observations: { type: "string" }
  },
  required: [
    "phase",
    "duree",
    "objectif",
    "activites_enseignant",
    "activites_eleves",
    "observations"
  ]
};

// ============================================================
// SCHEMA DES REFERENCES
// ============================================================

const schemaReference = {
  type: "object",
  additionalProperties: false,
  properties: {
    type_source: {
      type: "string",
      enum: [
        "programme_officiel",
        "manuel_scolaire",
        "site_web",
        "autre",
        "a_verifier"
      ]
    },
    titre: { type: "string" },
    auteur_ou_organisme: { type: "string" },
    date_ou_edition: { type: "string" },
    pages: { type: "string" },
    url: { type: "string" },
    statut_verification: {
      type: "string",
      enum: [
        "information_connue",
        "lien_fourni_non_verifie",
        "a_verifier"
      ]
    },
    utilite: { type: "string" }
  },
  required: [
    "type_source",
    "titre",
    "auteur_ou_organisme",
    "date_ou_edition",
    "pages",
    "url",
    "statut_verification",
    "utilite"
  ]
};

// ============================================================
// SCHEMA DU COURS
// ============================================================

const schemaCours = {
  type: "object",
  additionalProperties: false,
  properties: {
    titre: { type: "string" },
    classe: { type: "string" },
    matiere: { type: "string" },
    chapitre: { type: "string" },
    duree: { type: "string" },
    prerequis: { type: "string" },
    objectifs_specifiques: {
      type: "array",
      items: { type: "string" }
    },

    justification: { type: "string" },
    materiel_didactique: { type: "string" },
    references: { type: "string" },

    references_detaillees: {
      type: "array",
      items: schemaReference
    },

    situation_probleme: { type: "string" },
    activite_apprentissage: { type: "string" },
    solution_activite: { type: "string" },
    deroulement: { type: "string" },

    tableau_deroulement: {
      type: "array",
      items: schemaLigneDeroulement
    },

    trace_ecrite: { type: "string" },

    trace_structuree: {
      type: "array",
      items: schemaBlocTrace
    },

    exercices: { type: "string" },
    corrections: { type: "string" },
    evaluation: { type: "string" },
    devoir_maison: { type: "string" }
  },
  required: [
  "titre",
  "classe",
  "matiere",
  "chapitre",
  "duree",
  "prerequis",
  "objectifs_specifiques",
  "justification",
  "materiel_didactique",
  "references",
  "references_detaillees",
  "situation_probleme",
  "activite_apprentissage",
  "solution_activite",
  "deroulement",
  "tableau_deroulement",
  "trace_ecrite",
  "trace_structuree",
  "exercices",
  "corrections",
  "evaluation",
  "devoir_maison"
]
}  
// ============================================================
// SCHEMA DES EXERCICES
// ============================================================

const schemaExercices = {
  type: "object",
  additionalProperties: false,
  properties: {
    titre: { type: "string" },
    classe: { type: "string" },
    matiere: { type: "string" },
    consigne_generale: { type: "string" },

    exercices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          numero: { type: "integer" },
          enonce: { type: "string" },
          competence: { type: "string" },
          difficulte: { type: "string" }
        },
        required: [
          "numero",
          "enonce",
          "competence",
          "difficulte"
        ]
      }
    },

    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          numero: { type: "integer" },
          solution: { type: "string" },
          explication: { type: "string" }
        },
        required: [
          "numero",
          "solution",
          "explication"
        ]
      }
    }
  },
  required: [
    "titre",
    "classe",
    "matiere",
    "consigne_generale",
    "exercices",
    "corrections"
  ]
};

// ============================================================
// APPEL OPENAI AVEC JSON STRUCTURE
// ============================================================

async function appelerOpenAI(
  instructions,
  schema,
  nomSchema
) {
  verifierCleAPI();

  const reponse = await openai.responses.create({
    model: MODEL,

    instructions:
      "Tu es un spécialiste de pédagogie et de didactique. " +
      "Tu produis des ressources scolaires adaptées au Niger. " +
      "Tu dois respecter précisément la demande de l'enseignant, " +
      "notamment chaque objectif sélectionné. " +
      "N'invente jamais de faits ou de références documentaires. " +
      "Respecte strictement le schéma JSON fourni.",

    input: instructions,

    text: {
      format: {
        type: "json_schema",
        name: nomSchema,
        strict: true,
        schema
      }
    }
  });

  const sortie = reponse.output_text;

  if (!sortie || !sortie.trim()) {
    throw new Error(
      "L'API a renvoyé une réponse vide."
    );
  }

  try {
    return JSON.parse(sortie);
  } catch (erreur) {
    throw new Error(
      "Impossible de lire le JSON renvoyé par l'IA : " +
      erreur.message
    );
  }
}

// ============================================================
// CONSTRUCTION DES INSTRUCTIONS DU COURS
// ============================================================

function construireInstructionsCours(r) {
  const listeObjectifs =
    r.objectifsSelectionnes.length > 0
      ? r.objectifsSelectionnes
          .map((objectif, index) =>
            `${index + 1}. ${objectif}`
          )
          .join("\n")
      : "Aucun objectif reçu dans le champ dédié.";

  return `
CIFON PEDAGOGIE NIGER
FICHE PEDAGOGIQUE DETAILLEE

INFORMATIONS :
Classe : ${r.classe}
Matière : ${r.matiere}
Série : ${r.serie || "Non précisée"}
Chapitre : ${r.chapitre}
Thème : ${r.theme || "Non précisé"}
Durée : ${r.duree}
Niveau : ${r.niveau || "Non précisé"}

CONTENU DU PROGRAMME :
${r.contenuProgramme || "Non transmis."}

SOURCE DU PROGRAMME :
${r.sourceProgramme || "Non précisée."}

PRECISIONS DE L'ENSEIGNANT :
${r.details || "Aucune."}

============================================================
OBJECTIFS SELECTIONNES PAR L'ENSEIGNANT
============================================================

${listeObjectifs}

============================================================
REGLE PRIORITAIRE : RESPECT EXACT DES OBJECTIFS
============================================================

Les objectifs sélectionnés ci-dessus constituent la priorité
pédagogique de cette préparation.

Tu dois impérativement :

1. Traiter chaque objectif sélectionné, sans en oublier un.
2. Conserver le sens de chaque objectif et ne pas le remplacer
   par un objectif général différent.
3. Faire apparaître tous les objectifs sélectionnés dans
   le champ objectifs_specifiques.
4. Organiser la trace écrite pour répondre explicitement
   à chacun des objectifs.
5. Si un objectif demande de DÉFINIR une notion, écrire
   une véritable définition explicite, complète et correcte.
   Ne pas se contenter d'un exemple, d'une description ou
   d'une phrase qui évoque simplement la notion.
6. Si un objectif demande d'IDENTIFIER, nommer les éléments
   attendus et expliquer comment les reconnaître.
7. Si un objectif demande de CONSTRUIRE, présenter les étapes
   précises de construction.
8. Si un objectif demande de CALCULER, montrer la méthode,
   les formules utiles, les opérations et les unités.
9. Si un objectif demande de DÉMONTRER ou JUSTIFIER,
   développer le raisonnement étape par étape.
10. Si un objectif demande de CITER ou ÉNUMÉRER,
    fournir explicitement la liste attendue.
11. Si un objectif demande de COMPARER, faire ressortir
    les ressemblances et les différences.
12. Donner au moins un exemple pertinent pour chaque notion
    importante introduite par les objectifs.
13. Construire les exercices et l'évaluation à partir
    des objectifs sélectionnés.
14. Donner les corrections détaillées de tous les exercices.
15. Ne pas affirmer qu'un objectif est traité si la définition,
    l'explication ou la méthode correspondante est absente.

EXEMPLE DE COMPORTEMENT ATTENDU :
Si l'objectif sélectionné est « Définir le cube »,
la trace écrite doit contenir une rubrique « Définition du cube »
avec une définition mathématique explicite.
Une simple phrase parlant d'un cube ne suffit pas.

Si l'objectif sélectionné est « Identifier les faces, les arêtes
et les sommets du cube », la trace écrite doit expliquer ces
trois éléments et permettre de les reconnaître.

Ne pas utiliser cet exemple comme contenu obligatoire si
la leçon demandée porte sur un autre sujet. Appliquer la même
logique au véritable contenu de chaque objectif.

Si aucun objectif n'a été reçu dans le champ dédié, examiner
les précisions de l'enseignant et le contenu du programme.
Ne prétends pas avoir reçu une liste d'objectifs cochés
si elle est absente de la demande.

============================================================
EXIGENCES DE LA FICHE PEDAGOGIQUE
============================================================

A. IDENTIFICATION
Fournir le titre, la classe, la matière, le chapitre et la durée.

B. PREREQUIS
Préciser les connaissances indispensables avant la leçon.

C. OBJECTIF GENERAL
Formuler un objectif général observable et cohérent
avec les objectifs sélectionnés.

D. OBJECTIFS SPECIFIQUES
Reprendre fidèlement tous les objectifs sélectionnés.
Ne pas les remplacer par des formulations différentes.
S'il n'y a aucun objectif transmis, proposer des objectifs
pertinents et ne pas les présenter comme sélectionnés.

E. JUSTIFICATION
Expliquer l'intérêt de la leçon et sa place dans l'apprentissage.

F. MATERIEL DIDACTIQUE
Préciser le matériel nécessaire et son utilisation.

G. REFERENCES
Ne pas inventer de manuel, d'auteur, de page, d'année ou de lien.
Si une source n'est pas connue, indiquer qu'elle doit être vérifiée.
Ne pas affirmer qu'une source a été consultée si ce n'est pas le cas.

H. SITUATION-PROBLEME

Créer une situation-problème adaptée au niveau des élèves,
avec un contexte concret, des données suffisantes et une
question claire liée aux objectifs spécifiques sélectionnés.

Le champ situation_probleme doit être une chaîne de caractères
contenant l'énoncé complet de la situation.

I. ACTIVITE D'APPRENTISSAGE ET SOLUTION

Le champ activite_apprentissage doit reprendre exactement
le même énoncé que situation_probleme.

Le champ solution_activite doit contenir la résolution
détaillée de cette situation-problème, étape par étape,
avec les calculs, explications, raisonnements et conclusions
nécessaires selon la discipline.

La solution doit répondre explicitement à la question centrale
de la situation-problème.

Ne laisse jamais le champ solution_activite vide.
J. DEROULEMENT
Le champ deroulement doit résumer le déroulement de la séance.

Le champ tableau_deroulement doit contenir au moins cinq étapes
pertinentes, avec :
- phase ;
- duree ;
- objectif ;
- activites_enseignant ;
- activites_eleves ;
- observations.

Les activités doivent être spécifiques à la leçon et aux objectifs.
Éviter les phrases vagues et les répétitions.
La somme des durées doit être cohérente avec la durée totale.

K. TRACE ECRITE
Rédiger une véritable leçon que l'élève peut copier dans son cahier.
Elle doit être autonome, structurée, progressive et suffisamment
détaillée pour répondre aux objectifs sélectionnés.

Inclure les définitions, propriétés, règles, formules, méthodes,
exemples et conclusions nécessaires selon la discipline.

Ne pas remplacer une définition par une simple activité.
Ne pas remplacer une explication par un titre.
Ne pas omettre les éléments demandés par les objectifs.

L. TRACE STRUCTUREE
Créer plusieurs blocs utiles et ordonnés :
heading, subheading, paragraph, list, table ou diagram.

Tous les champs requis doivent être présents.
Les champs non utilisés doivent contenir des chaînes vides
ou des tableaux vides.

M. EXERCICES
Proposer des exercices progressifs qui vérifient réellement
les objectifs sélectionnés.
Les consignes doivent être claires et les données suffisantes.

N. CORRECTIONS
Corriger tous les exercices, dans le même ordre.
Expliquer le raisonnement et les calculs.

O. EVALUATION
Proposer des questions permettant de vérifier chaque objectif.
Fournir les réponses attendues ou les critères de réussite.

P. DEVOIR A LA MAISON
Proposer un travail réalisable et adapté à la classe.

============================================================
CONTROLE PEDAGOGIQUE AVANT REPONSE
============================================================

Avant de produire le JSON final, vérifie silencieusement :

- Chaque objectif sélectionné est-il présent dans
  objectifs_specifiques ?
- La trace écrite répond-elle à chacun des objectifs ?
- Les définitions demandées sont-elles écrites explicitement ?
- Les méthodes et propriétés demandées sont-elles expliquées ?
- Les exercices portent-ils sur ces objectifs ?
- Les corrections sont-elles complètes ?
- L'évaluation vérifie-t-elle ces objectifs ?
- Les activités sont-elles adaptées à la classe et à la durée ?
- Les références non vérifiées sont-elles clairement signalées ?

Corrige toute omission avant de produire la réponse.

Respecte strictement le schéma JSON.
Ne fournis aucun texte en dehors du JSON.
`;
}

// ============================================================
// VALIDATION DU COURS
// ============================================================

function verifierCours(cours, requete) {
  if (!cours || typeof cours !== "object") {
    throw new Error(
      "Le cours généré est vide ou invalide."
    );
  }

  const champsObligatoires = [
    "titre",
    "prerequis",
    "justification",
    "materiel_didactique",
    "references",
    "situation_probleme",
    "activite_apprentissage",
    "deroulement",
    "solution_activite",
    "trace_ecrite",
    "exercices",
    "corrections",
    "evaluation"
];
  for (const champ of champsObligatoires) {
    if (!texte(cours[champ])) {
      throw new Error(
        "Le cours ne contient pas le champ obligatoire : " +
        champ
      );
    }
  }

  if (
    !Array.isArray(cours.objectifs_specifiques)
  ) {
    throw new Error(
      "Les objectifs spécifiques sont absents ou invalides."
    );
  }

  if (
    !Array.isArray(cours.tableau_deroulement) ||
    cours.tableau_deroulement.length === 0
  ) {
    throw new Error(
      "Le tableau structuré du déroulement est absent."
    );
  }

  const champsLigne = [
    "phase",
    "duree",
    "objectif",
    "activites_enseignant",
    "activites_eleves",
    "observations"
  ];

  for (const ligne of cours.tableau_deroulement) {
  for (const champ of champsLigne) {
    if (
      champ !== "observations" &&
      !texte(ligne[champ])
    ) {
      throw new Error(
        "Une ligne du déroulement ne contient pas le champ : " +
        champ
      );
    }
  }

  // Cette colonne doit rester vide pour que l'enseignant
  // puisse la compléter lui-même.
  ligne.observations = "";
}

  if (!Array.isArray(cours.references_detaillees)) {
    throw new Error(
      "Les références détaillées sont invalides."
    );
  }

  if (
    !Array.isArray(cours.trace_structuree) ||
    cours.trace_structuree.length === 0
  ) {
    throw new Error(
      "La trace structurée du cours est absente."
    );
  }

  for (const bloc of cours.trace_structuree) {
    if (!Array.isArray(bloc.formes)) {
      throw new Error(
        "Un bloc de la trace structurée ne contient pas le tableau formes."
      );
    }

    for (const forme of bloc.formes) {
      const coordonnees = [
        forme.x1,
        forme.y1,
        forme.x2,
        forme.y2,
        forme.x3,
        forme.y3,
        forme.rayon
      ];

      for (const valeur of coordonnees) {
        if (
          typeof valeur !== "number" ||
          !Number.isFinite(valeur) ||
          valeur < 0 ||
          valeur > 100
        ) {
          throw new Error(
            "Une figure contient des coordonnées invalides."
          );
        }
      }

      if (
        forme.type === "circle" &&
        forme.rayon <= 0
      ) {
        throw new Error(
          "Une figure circulaire doit avoir un rayon positif."
        );
      }
    }
  }

  // Vérification de la présence des objectifs sélectionnés.
  // La comparaison normalise les espaces et la casse.
  const normaliser = (valeur) =>
    texte(valeur)
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  if (
    requete &&
    requete.objectifsSelectionnes.length > 0
  ) {
    const objectifsGeneres =
      cours.objectifs_specifiques.map(normaliser);

    const objectifsAbsents =
      requete.objectifsSelectionnes.filter(
        (objectif) => {
          const cible = normaliser(objectif);

          return !objectifsGeneres.some(
            (genere) =>
              genere === cible ||
              genere.includes(cible) ||
              cible.includes(genere)
          );
        }
      );

    if (objectifsAbsents.length > 0) {
      throw new Error(
        "Le cours ne reprend pas fidèlement tous les objectifs sélectionnés. " +
        "Objectifs absents ou reformulés : " +
        objectifsAbsents.join(" ; ") +
        ". Vérifie la transmission des objectifs depuis Android."
      );
    }
  }

  return cours;
}

// ============================================================
// ROUTE D'ACCUEIL
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    application: "CIFON PEDAGOGIE NIGER",
    serveur: "operationnel",
    version: VERSION,
    modele: MODEL,
    routes: [
      "/",
      "/sante",
      "/test-generation",
      "/generer-cours",
      "/generer-exercices"
    ]
  });
});

// ============================================================
// SANTE
// ============================================================

app.get("/sante", (req, res) => {
  res.json({
    success: true,
    statut: "operationnel",
    application: "CIFON PEDAGOGIE NIGER",
    version: VERSION,
    modele: MODEL,
    cle_api_configuree: Boolean(
      process.env.OPENAI_API_KEY
    )
  });
});

// ============================================================
// TEST GENERATION
// ============================================================

app.get("/test-generation", async (req, res) => {
  try {
    const resultat = await appelerOpenAI(
      "Réponds avec un objet JSON comportant un titre de cours " +
      "et une explication courte sur le cube et le pavé droit " +
      "pour une classe de 6e au Niger.",

      {
        type: "object",
        additionalProperties: false,
        properties: {
          titre: { type: "string" },
          explication: { type: "string" }
        },
        required: [
          "titre",
          "explication"
        ]
      },

      "test_generation_cifon"
    );

    res.json({
      success: true,
      version: VERSION,
      resultat
    });
  } catch (erreur) {
    console.error("Erreur /test-generation :", erreur);

    res.status(500).json({
      success: false,
      erreur: erreur.message,
      version: VERSION
    });
  }
});

// ============================================================
// GENERATION DU COURS
// ============================================================

app.post("/generer-cours", async (req, res) => {
  try {
    const requete = extraireRequete(req.body || {});

    if (
      requete.classe === "Non précisée" ||
      requete.matiere === "Non précisée"
    ) {
      return res.status(400).json({
        success: false,
        erreur: "La classe et la matière sont obligatoires."
      });
    }

    console.log(
      "Génération du cours :",
      requete.classe,
      "|",
      requete.matiere,
      "|",
      requete.chapitre,
      "| Objectifs :",
      requete.objectifsSelectionnes.length
    );

    const instructions =
      construireInstructionsCours(requete);

    const cours = await appelerOpenAI(
      instructions,
      schemaCours,
      "fiche_pedagogique_cifon"
    );

    // Ne pas accepter silencieusement un cours incomplet.
    verifierCours(cours, requete);

    cours.classe = texte(
      cours.classe,
      requete.classe
    );

    cours.matiere = texte(
      cours.matiere,
      requete.matiere
    );

    cours.chapitre = texte(
      cours.chapitre,
      requete.chapitre
    );

    cours.duree = texte(
      cours.duree,
      requete.duree
    );

    return res.json({
      success: true,
      cours,
      serveur: "CIFON PEDAGOGIE NIGER",
      version: VERSION,
      modele: MODEL,
      objectifs_recus: requete.objectifsSelectionnes.length
    });
  } catch (erreur) {
    console.error("Erreur /generer-cours :", erreur);

    return res.status(500).json({
      success: false,
      erreur:
        erreur.message ||
        "Erreur lors de la génération du cours.",
      version: VERSION
    });
  }
});

// ============================================================
// GENERATION DES EXERCICES
// ============================================================

app.post("/generer-exercices", async (req, res) => {
  try {
    const requete = extraireRequete(req.body || {});

    if (
      requete.classe === "Non précisée" ||
      requete.matiere === "Non précisée"
    ) {
      return res.status(400).json({
        success: false,
        erreur: "La classe et la matière sont obligatoires."
      });
    }

    const nombre = Math.min(
      Math.max(requete.nombre, 1),
      20
    );

    const objectifs =
      requete.objectifsSelectionnes.length > 0
        ? requete.objectifsSelectionnes
            .map((objectif, index) =>
              `${index + 1}. ${objectif}`
            )
            .join("\n")
        : "Aucun objectif sélectionné transmis.";

    const instructions = `
Tu es un spécialiste en didactique et en évaluation scolaire.

Classe : ${requete.classe}
Matière : ${requete.matiere}
Chapitre : ${requete.chapitre}
Thème : ${requete.theme || "Non précisé"}
Précisions : ${requete.details || "Aucune"}

OBJECTIFS SELECTIONNES :
${objectifs}

Génère ${nombre} exercices progressifs adaptés à la classe.

Les exercices doivent vérifier directement les objectifs sélectionnés.
Ne remplace pas ces objectifs par d'autres.
Si un objectif demande une définition, inclure une question
demandant explicitement cette définition.
Si un objectif demande une méthode ou un calcul, inclure
un exercice qui vérifie cette méthode ou ce calcul.

Donne une correction détaillée pour chaque exercice.
Vérifie les réponses et les calculs.
Respecte strictement le schéma JSON.
`;

    const resultat = await appelerOpenAI(
      instructions,
      schemaExercices,
      "exercices_corrections_cifon"
    );

    if (
      !Array.isArray(resultat.exercices) ||
      resultat.exercices.length === 0
    ) {
      throw new Error(
        "Aucun exercice n'a été généré."
      );
    }

    if (
      !Array.isArray(resultat.corrections) ||
      resultat.corrections.length === 0
    ) {
      throw new Error(
        "Aucune correction n'a été générée."
      );
    }

    return res.json({
      success: true,
      resultat,
      exercices: resultat.exercices,
      corrections: resultat.corrections,
      serveur: "CIFON PEDAGOGIE NIGER",
      version: VERSION,
      modele: MODEL
    });
  } catch (erreur) {
    console.error(
      "Erreur /generer-exercices :",
      erreur
    );

    return res.status(500).json({
      success: false,
      erreur:
        erreur.message ||
        "Erreur lors de la génération des exercices.",
      version: VERSION
    });
  }
});

// ============================================================
// ROUTES INCONNUES
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    erreur: "Route introuvable.",
    route: req.path,
    version: VERSION
  });
});

// ============================================================
// GESTION DES ERREURS
// ============================================================

app.use((erreur, req, res, next) => {
  console.error("Erreur serveur :", erreur);

  if (res.headersSent) {
    return next(erreur);
  }

  res.status(500).json({
    success: false,
    erreur:
      erreur.message ||
      "Une erreur interne est survenue.",
    version: VERSION
  });
});

// ============================================================
// DEMARRAGE DU SERVEUR
// ============================================================

async function demarrerServeur() {
  try {
    if (!pool) {
      throw new Error(
        "DATABASE_URL est absente des variables d'environnement."
      );
    }

    await pool.query("SELECT NOW()");
    console.log("PostgreSQL : connexion réussie.");

    await initialiserBaseUtilisateurs();

    app.listen(PORT, () => {
      console.log("============================================");
      console.log(" CIFON PEDAGOGIE NIGER");
      console.log(" Serveur démarré sur le port " + PORT);
      console.log(" Version : " + VERSION);
      console.log(" Modèle : " + MODEL);
      console.log(
        " Clé API configurée : " +
        Boolean(process.env.OPENAI_API_KEY)
      );
      console.log(" Base de données : connectée");
      console.log(" Table utilisateurs : prête");
      console.log("============================================");
    });
  } catch (erreur) {
    console.error(
      "Erreur au démarrage de CIFON PEDAGOGIE NIGER :",
      erreur.message
    );

    process.exit(1);
  }
}

demarrerServeur();
