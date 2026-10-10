
"use strict";

const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json({ limit: "2mb" }));

// ============================================================
// CIFON PEDAGOGIE NIGER
// SERVEUR CENTRAL DE GENERATION PEDAGOGIQUE
// Version 2.6.0
// ============================================================

const PORT = process.env.PORT || 3000;
const VERSION = "2.6.0";
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================
// SCHEMA DES FORMES POUR LES FIGURES
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
    "type", "x1", "y1", "x2", "y2",
    "x3", "y3", "rayon", "label"
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
    "type", "titre", "texte", "elements",
    "colonnes", "lignes", "description",
    "legende", "formes"
  ]
};

// ============================================================
// SCHEMA D'UNE LIGNE DU TABLEAU DE DEROULEMENT
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
// SCHEMA DES REFERENCES DOCUMENTAIRES
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
// SCHEMA COMPLET D'UNE FICHE PEDAGOGIQUE
// Les champs historiques sont conserves.
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
    objectif_general: { type: "string" },

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

    // Champ textuel conservé pour compatibilité.
    deroulement: { type: "string" },

    // Données structurées pour le véritable tableau Android.
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
    "objectif_general",
    "objectifs_specifiques",
    "justification",
    "materiel_didactique",
    "references",
    "references_detaillees",
    "situation_probleme",
    "activite_apprentissage",
    "deroulement",
    "tableau_deroulement",
    "trace_ecrite",
    "trace_structuree",
    "exercices",
    "corrections",
    "evaluation",
    "devoir_maison"
  ]
};

// ============================================================
// SCHEMA DE GENERATION DES EXERCICES
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

function extraireRequete(body) {
  const r =
    body && typeof body === "object"
      ? body
      : {};

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
      r.chapitre || r.lecon || r.titre,
      "À déterminer"
    ),
    theme: texte(r.theme, ""),
    duree: texte(r.duree, "À préciser"),
    niveau: texte(r.niveau, ""),
    type: texte(r.type, ""),
    nombre: Number(r.nombre) || 5,
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
// VALIDATION DU COURS
// ============================================================

function verifierCours(cours) {
  if (!cours || typeof cours !== "object") {
    throw new Error("Le cours généré est vide ou invalide.");
  }

  const champsObligatoires = [
    "titre",
    "prerequis",
    "objectif_general",
    "justification",
    "materiel_didactique",
    "references",
    "situation_probleme",
    "activite_apprentissage",
    "deroulement",
    "trace_ecrite",
    "exercices",
    "corrections",
    "evaluation"
  ];

  for (const champ of champsObligatoires) {
    if (!texte(cours[champ])) {
      throw new Error(
        "Le cours généré ne contient pas le champ obligatoire : " +
        champ
      );
    }
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
      if (!texte(ligne[champ])) {
        throw new Error(
          "Une ligne du déroulement ne contient pas le champ : " +
          champ
        );
      }
    }
  }

  if (
    !Array.isArray(cours.references_detaillees)
  ) {
    throw new Error(
      "Le tableau des références détaillées est invalide."
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

  return cours;
}

// ============================================================
// APPEL A L'API OPENAI
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
      "Tu es un expert en pédagogie, en didactique et en conception " +
      "de ressources éducatives adaptées au Niger. " +
      "Produis des contenus exacts, riches, progressifs et directement " +
      "exploitables par un enseignant. Respecte strictement le schéma JSON.",

    input: instructions,

    text: {
      format: {
        type: "json_schema",
        name: nomSchema,
        strict: true,
        schema: schema
      }
    }
  });

  const sortie = reponse.output_text;

  if (!sortie || !sortie.trim()) {
    throw new Error("L'API a renvoyé une réponse vide.");
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
// INSTRUCTIONS DE GENERATION DU COURS
// ============================================================

function construireInstructionsCours(r) {
  return `
MISSION :
Préparer une fiche pédagogique complète, rigoureuse, détaillée
et directement exploitable dans une classe au Niger.

INFORMATIONS :
- Classe : ${r.classe}
- Matière : ${r.matiere}
- Série : ${r.serie || "Non précisée"}
- Chapitre : ${r.chapitre}
- Thème : ${r.theme || "Aucun"}
- Durée : ${r.duree}
- Niveau : ${r.niveau || "Non précisé"}
- Précisions : ${r.details || "Aucune"}

REGLES GENERALES :
1. Adapter les contenus au niveau réel des élèves.
2. Respecter les connaissances préalables.
3. Employer des exemples concrets adaptés au Niger.
4. Donner des explications suffisamment détaillées.
5. Éviter les répétitions et les phrases vagues.
6. Ne pas inventer de source officielle, d'auteur, de page ou de lien.
7. Distinguer clairement les informations connues de celles à vérifier.

A. IDENTIFICATION
Fournir le titre, la classe, la matière, le chapitre et la durée.

B. PREREQUIS
Présenter les connaissances nécessaires à l'apprentissage.

C. OBJECTIF GENERAL
Formuler un objectif observable et adapté au niveau.

D. OBJECTIFS SPECIFIQUES
Donner plusieurs objectifs mesurables avec des verbes d'action.

E. JUSTIFICATION
Expliquer l'intérêt de la leçon dans la progression, les apprentissages
futurs et la vie courante.

F. MATERIEL DIDACTIQUE
Distinguer le matériel indispensable du matériel facultatif.

G. REFERENCES ET SOURCES DOCUMENTAIRES

Le champ references doit présenter clairement les références disponibles.
Le champ references_detaillees doit contenir des objets structurés.

Pour chaque source, préciser :
- type_source ;
- titre ;
- auteur_ou_organisme ;
- date_ou_edition ;
- pages ;
- url ;
- statut_verification ;
- utilite.

Types de sources autorisés :
programme_officiel, manuel_scolaire, site_web, autre, a_verifier.

Statuts autorisés :
information_connue, lien_fourni_non_verifie, a_verifier.

Pour le programme officiel du Niger, préciser la classe et la matière
lorsque ces informations sont connues. Ne pas inventer de titre officiel,
d'année d'édition ou de numéro de page.

Pour les manuels, ne fournir le titre, les auteurs, l'éditeur et les pages
que lorsque ces informations sont connues.

Pour les sites internet, donner le nom du site et le lien direct seulement
si l'adresse est connue. Un lien proposé mais non vérifié doit porter
le statut lien_fourni_non_verifie. Ne jamais affirmer qu'une page a été
consultée si sa consultation n'a pas été effectuée.

Si aucune référence précise n'est connue, créer une entrée de type
a_verifier, avec un titre indiquant que les références officielles
doivent être vérifiées, une URL vide et un statut a_verifier.

Ne pas présenter une source recommandée comme une source effectivement
consultée. Ne jamais fabriquer de références pour remplir la rubrique.

H. SITUATION-PROBLEME
Créer une situation concrète avec un contexte, des données et une question.

I. ACTIVITE D'APPRENTISSAGE
Décrire les activités, les questions, les recherches et les réponses attendues.

J. DEROULEMENT DE LA SEANCE

Le champ deroulement doit contenir un résumé textuel du déroulement.

Le champ tableau_deroulement doit contenir au minimum cinq lignes
pédagogiques structurées, sauf si la nature de la leçon justifie autrement.

Chaque ligne doit renseigner exactement :
- phase : nom de l'étape ;
- duree : durée indicative de l'étape ;
- objectif : objectif de l'étape ;
- activites_enseignant : actions et consignes précises de l'enseignant ;
- activites_eleves : actions et réponses attendues des élèves ;
- observations : points à vérifier, difficultés possibles ou critères de réussite.

Prévoir des étapes pertinentes, par exemple :
1. Rappel des prérequis.
2. Présentation de la situation-problème.
3. Recherche individuelle ou en groupes.
4. Mise en commun et explication.
5. Institutionnalisation ou synthèse.
6. Exercices d'application.
7. Évaluation, si la durée le permet.

Adapter les étapes à la discipline. Les durées doivent être réalistes
et leur somme doit être cohérente avec la durée totale annoncée.

Ne pas remplir les cellules par des phrases génériques identiques.
Les activités doivent correspondre précisément à la leçon demandée.

K. TRACE ECRITE
Fournir une leçon complète et progressive, avec définitions, règles,
propriétés, méthodes, formules et exemples selon la discipline.
En mathématiques, détailler les calculs et justifier les résultats.
En sciences, distinguer observations, explications et conclusions.

L. TRACE STRUCTUREE
Créer plusieurs blocs ordonnés :
heading, subheading, paragraph, list, table ou diagram.

Tous les champs du schéma doivent être présents.
Les champs non utilisés doivent être vides ou contenir un tableau vide.

Pour les tableaux, renseigner les colonnes et des lignes cohérentes.
Pour les figures, utiliser des coordonnées de 0 à 100.
Les formes doivent être adaptées au sujet, et non décoratives.

M. EXERCICES
Proposer des exercices progressifs, avec des données suffisantes
et des consignes sans ambiguïté.

N. CORRECTIONS
Corriger chaque exercice dans le même ordre avec le raisonnement détaillé.

O. EVALUATION
Vérifier les objectifs spécifiques et préciser les réponses attendues
ou les critères de réussite.

P. DEVOIR A LA MAISON
Proposer un travail réaliste et adapté au niveau.

EXIGENCE FINALE :
Le contenu doit être substantiel, exact et pédagogique.
Respecter strictement le schéma JSON demandé.
Ne pas ajouter de propriétés non prévues.
`;
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
// VERIFICATION DE SANTE
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
// TEST DE GENERATION
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
        required: ["titre", "explication"]
      },

      "test_generation_cifon"
    );

    res.json({
      success: true,
      version: VERSION,
      resultat: resultat
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
// GENERATION D'UN COURS COMPLET
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
      requete.chapitre
    );

    const instructions =
      construireInstructionsCours(requete);

    const cours = await appelerOpenAI(
      instructions,
      schemaCours,
      "fiche_pedagogique_cifon"
    );

    verifierCours(cours);

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

    console.log(
      "Cours généré et validé avec tableau structuré."
    );

    return res.json({
      success: true,
      cours: cours,
      serveur: "CIFON PEDAGOGIE NIGER",
      version: VERSION,
      modele: MODEL
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
// GENERATION D'EXERCICES ET DE CORRECTIONS
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

    const instructions = `
Tu es un expert en didactique et en évaluations scolaires.

Génère ${nombre} exercices adaptés à des élèves de
${requete.classe}, en ${requete.matiere}.

Chapitre : ${requete.chapitre}
Thème : ${requete.theme || "À déterminer"}
Précisions : ${requete.details || "Aucune"}

CONSIGNES :
1. Proposer des exercices progressifs et compréhensibles.
2. Adapter les données et le vocabulaire au niveau scolaire.
3. Vérifier l'exactitude des réponses.
4. Donner une correction complète pour chaque exercice.
5. Expliquer les étapes de raisonnement et les calculs.
6. Numéroter les exercices et corrections de façon cohérente.
7. Ne pas inventer de références officielles.
8. Respecter strictement le format JSON demandé.
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
      resultat: resultat,
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
// GESTION DES ERREURS EXPRESS
// ============================================================

app.use((erreur, req, res, next) => {
  console.error("Erreur serveur :", erreur);

  if (res.headersSent) {
    return next(erreur);
  }

  res.status(500).json({
    success: false,
    erreur: "Une erreur interne est survenue.",
    version: VERSION
  });
});

// ============================================================
// DEMARRAGE DU SERVEUR
// ============================================================

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
  console.log("============================================");
});
