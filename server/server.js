
"use strict";

const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json({ limit: "2mb" }));

// ============================================================
// CIFON PEDAGOGIE NIGER
// SERVEUR CENTRAL DE GENERATION PEDAGOGIQUE
// Version 2.5.0
// ============================================================

const PORT = process.env.PORT || 3000;
const VERSION = "2.5.0";
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================
// SCHEMA DES FORMES POUR LE DESSIN DES FIGURES
// Coordonnees normalisees de 0 a 100
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
// SCHEMA COMPLET D'UNE FICHE PEDAGOGIQUE
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
    situation_probleme: { type: "string" },
    activite_apprentissage: { type: "string" },
    deroulement: { type: "string" },
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
    "situation_probleme",
    "activite_apprentissage",
    "deroulement",
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
// OUTILS
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
    classe: texte(r.classe || r.niveau_scolaire, "Non précisée"),
    matiere: texte(r.matiere || r.discipline, "Non précisée"),
    serie: texte(r.serie, ""),
    chapitre: texte(r.chapitre || r.lecon || r.titre, "À déterminer"),
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

async function appelerOpenAI(instructions, schema, nomSchema) {
  verifierCleAPI();

  const reponse = await openai.responses.create({
    model: MODEL,
    instructions:
      "Tu es un expert en pédagogie, en didactique et en conception " +
      "de ressources éducatives adaptées au Niger. " +
      "Tu produis des contenus exacts, riches, progressifs et utilisables " +
      "directement par un enseignant. Respecte strictement le format demandé.",
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
// INSTRUCTIONS DE GENERATION D'UN COURS
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
- Chapitre ou leçon : ${r.chapitre}
- Thème complémentaire : ${r.theme || "Aucun"}
- Durée indicative : ${r.duree}
- Niveau : ${r.niveau || "Non précisé"}
- Précisions de l'enseignant : ${r.details || "Aucune"}

REGLES GENERALES :
1. Adapter le vocabulaire, les exemples et les exercices à la classe.
2. Respecter les connaissances préalables des élèves.
3. Ne pas inventer de référence officielle, de page de manuel
   ou de texte réglementaire.
4. Si une référence officielle précise n'est pas connue,
   indiquer honnêtement les ressources pédagogiques générales
   à consulter et la nécessité de vérifier le programme en vigueur.
5. Employer des exemples concrets, si possible adaptés au contexte
   nigérien et au milieu rural.
6. Donner des explications suffisantes pour qu'un enseignant
   puisse préparer et conduire sa séance sans devoir tout compléter.
7. Éviter les phrases vagues, les répétitions et les contenus trop courts.

CONTENU OBLIGATOIRE :

A. TITRE ET IDENTIFICATION
Indiquer le titre, la classe, la matière, le chapitre et la durée.

B. PREREQUIS
Préciser les connaissances que les élèves doivent déjà maîtriser.
Donner au moins deux prérequis pertinents lorsque le sujet le permet.

C. OBJECTIF GENERAL
Formuler un objectif pédagogique clair et observable.

D. OBJECTIFS SPECIFIQUES
Donner plusieurs objectifs mesurables avec des verbes d'action :
identifier, définir, calculer, construire, expliquer, démontrer,
comparer ou résoudre, selon la discipline.

E. JUSTIFICATION
Expliquer pourquoi cette leçon est importante :
- dans la progression scolaire ;
- pour les apprentissages futurs ;
- dans les situations de la vie courante ;
- pour le développement des compétences des élèves.

F. MATERIEL DIDACTIQUE
Lister le matériel concret nécessaire à la séance :
tableau, craie, cahier, règle, instruments de géométrie,
objets locaux, fiches, images ou supports numériques selon le sujet.
Distinguer le matériel indispensable du matériel facultatif.

G. REFERENCES
Indiquer les références réellement identifiables et pertinentes :
programme officiel applicable si connu, manuel scolaire adapté
à la classe si connu, documents pédagogiques et ressources de référence.
Ne jamais fabriquer un titre de document, un auteur, une date ou une page.
Si les références précises ne peuvent pas être établies, le signaler
explicitement et recommander la vérification du programme officiel
du Niger en vigueur.

H. SITUATION-PROBLEME
Proposer une situation concrète, compréhensible et adaptée à l'âge.
Présenter le contexte, les données utiles et la question à résoudre.
La situation doit permettre de faire émerger la notion étudiée.

I. ACTIVITE D'APPRENTISSAGE
Décrire ce que font les élèves, individuellement ou en groupes,
les questions posées par l'enseignant, les observations attendues
et les échanges qui conduisent à la découverte de la notion.

J. DEROULEMENT
Présenter un déroulement détaillé et chronologique :
1. Mise en situation et rappel des prérequis.
2. Présentation de la situation-problème.
3. Recherche individuelle ou en groupes.
4. Mise en commun et confrontation des réponses.
5. Explication et institutionnalisation par l'enseignant.
6. Exercices d'application.
7. Synthèse et vérification des acquis.

Pour chaque étape, préciser autant que possible :
- le rôle de l'enseignant ;
- les activités des élèves ;
- les questions ou consignes ;
- les réponses attendues ;
- la durée indicative.

K. TRACE ECRITE
Produire une leçon rédigée, complète et adaptée au niveau.
Inclure les définitions, propriétés, règles, méthodes, formules
et exemples nécessaires à la compréhension.
En mathématiques, détailler les calculs et justifier les résultats.
En sciences, distinguer observations, explications et conclusions.
Dans les autres disciplines, fournir les notions et méthodes adaptées.

L. TRACE STRUCTUREE
Créer une suite de blocs ordonnés permettant d'afficher une trace
écrite structurée dans l'application Android.

Types autorisés :
- heading : titre principal ;
- subheading : sous-titre ;
- paragraph : explication ;
- list : liste d'éléments ;
- table : tableau ;
- diagram : figure ou schéma.

Chaque bloc doit comporter tous les champs requis par le format JSON.
Le tableau "formes" doit toujours exister, même lorsqu'il est vide.

Pour les blocs de type table :
- remplir colonnes ;
- remplir lignes avec des cellules cohérentes.

Pour les blocs de type diagram :
- fournir une description précise ;
- fournir une légende utile ;
- créer des formes exploitables par le moteur de dessin.

COORDONNEES DES FIGURES :
Les coordonnées sont comprises entre 0 et 100.
L'origine (0,0) se trouve en haut à gauche.
x augmente vers la droite et y augmente vers le bas.

Formes disponibles :
- line : segment défini par x1, y1, x2, y2 ;
- triangle : sommets x1,y1 ; x2,y2 ; x3,y3 ;
- rectangle : coins opposés x1,y1 et x2,y2 ;
- circle : centre x1,y1 et rayon positif ;
- cube : schéma de cube à construire à partir des coordonnées
  et des segments nécessaires ;
- text : annotation positionnée à x1,y1 avec label.

Chaque objet forme doit renseigner tous les champs :
type, x1, y1, x2, y2, x3, y3, rayon et label.
Pour les champs inutilisés, utiliser 0 ou une chaîne vide.
Ne pas utiliser de coordonnées hors de l'intervalle 0-100.
Pour une figure géométrique utile, produire plusieurs formes cohérentes.
Ne pas créer de figure décorative sans rapport avec la leçon.

Si le sujet nécessite un schéma, un graphique, une construction
géométrique ou une figure scientifique, fournir un bloc diagram
avec les formes nécessaires.
Par exemple, pour une leçon sur le triangle, construire un triangle
réel avec trois sommets et ses côtés. Pour le cercle, préciser son centre,
son rayon et les annotations utiles.
Ne pas prétendre qu'une figure est dessinée si aucune forme n'est fournie.

M. EXERCICES
Proposer plusieurs exercices progressifs :
- compréhension directe ;
- application ;
- réflexion ou résolution de problème.
Fournir des données complètes et des consignes sans ambiguïté.

N. CORRECTIONS
Corriger chaque exercice dans le même ordre.
Donner les étapes de raisonnement et les calculs nécessaires.
Ne pas donner uniquement la réponse finale.

O. EVALUATION
Proposer des questions ou tâches permettant de vérifier les objectifs.
Inclure les réponses attendues ou les critères de réussite dans le texte.

P. DEVOIR A LA MAISON
Proposer un travail réaliste et adapté à la classe,
avec une consigne claire et des données suffisantes.

EXIGENCE DE QUALITE :
Le contenu doit être substantiel et pédagogique, et non un simple résumé.
Fournir suffisamment d'explications, d'exemples et d'activités.
Respecter strictement la structure JSON demandée.
Ne pas ajouter de propriétés qui ne figurent pas dans le schéma.
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
    cle_api_configuree: Boolean(process.env.OPENAI_API_KEY)
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

    const instructions = construireInstructionsCours(requete);

    const cours = await appelerOpenAI(
      instructions,
      schemaCours,
      "fiche_pedagogique_cifon"
    );

    verifierCours(cours);

    // Compléter les informations d'identification si nécessaire.
    cours.classe = texte(cours.classe, requete.classe);
    cours.matiere = texte(cours.matiere, requete.matiere);
    cours.chapitre = texte(cours.chapitre, requete.chapitre);
    cours.duree = texte(cours.duree, requete.duree);

    console.log("Cours généré et validé.");

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
      erreur: erreur.message || "Erreur lors de la génération du cours.",
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
Tu es un expert en didactique et en conception d'évaluations scolaires.

Génère ${nombre} exercices adaptés à des élèves de ${requete.classe},
en ${requete.matiere}.

Chapitre ou leçon : ${requete.chapitre}
Thème : ${requete.theme || "À déterminer"}
Précisions : ${requete.details || "Aucune"}

CONSIGNES :
1. Proposer des exercices progressifs et compréhensibles.
2. Adapter les données et le vocabulaire au niveau scolaire.
3. Vérifier l'exactitude des réponses.
4. Donner une correction complète pour chaque exercice.
5. Expliquer les étapes de raisonnement, et les calculs si nécessaire.
6. Numéroter les exercices et leurs corrections de façon cohérente.
7. Ne pas inventer de référence officielle.
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
      throw new Error("Aucun exercice n'a été généré.");
    }

    if (
      !Array.isArray(resultat.corrections) ||
      resultat.corrections.length === 0
    ) {
      throw new Error("Aucune correction n'a été générée.");
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
    console.error("Erreur /generer-exercices :", erreur);

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
// GESTION DES ROUTES INCONNUES
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
