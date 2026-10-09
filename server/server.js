
/* ============================================================
   CIFON PÉDAGOGIE NIGER
   SERVEUR IA — VERSION 2.4.0
   Génération de cours et d'exercices corrigés
   Compatible avec l'application Android existante
   ============================================================ */

const express = require("express");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VERSION = "2.4.0";
const MODELE_IA = "gpt-6-luna";

/* ============================================================
   ROUTES DE SANTÉ
   ============================================================ */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Serveur CIFON Pédagogie Niger opérationnel",
        version: VERSION,
        fonctions: [
            "/sante",
            "/test-generation",
            "/generer-cours",
            "/generer-exercices"
        ]
    });
});

app.get("/sante", (req, res) => {
    res.json({
        success: true,
        serveur: "CIFON Pédagogie Niger",
        version: VERSION,
        cle_api_configuree: Boolean(OPENAI_API_KEY)
    });
});

app.get("/test-generation", (req, res) => {
    res.json({
        success: true,
        message: "La route de génération est accessible.",
        version: VERSION,
        cle_api_configuree: Boolean(OPENAI_API_KEY)
    });
});

/* ============================================================
   OUTILS DE VALIDATION
   ============================================================ */

function estTexte(valeur) {
    return typeof valeur === "string";
}

function texteNonVide(valeur) {
    return estTexte(valeur) && valeur.trim().length > 0;
}

function estTableau(valeur) {
    return Array.isArray(valeur);
}

function validerDeroulement(deroulement) {
    if (!estTableau(deroulement) || deroulement.length === 0) {
        return false;
    }

    return deroulement.every((etape) =>
        etape &&
        texteNonVide(etape.etape) &&
        (typeof etape.duree_minutes === "number" ||
            (estTexte(etape.duree_minutes) &&
             etape.duree_minutes.trim() !== "")) &&
        texteNonVide(etape.activite_enseignant) &&
        texteNonVide(etape.activite_eleves)
    );
}

function validerTraceStructuree(blocs) {
    if (!estTableau(blocs)) return false;

    const typesAutorises = [
        "heading",
        "subheading",
        "paragraph",
        "list",
        "table",
        "diagram"
    ];

    return blocs.every((bloc) => {
        if (!bloc || !typesAutorises.includes(bloc.type)) {
            return false;
        }

        if (!estTexte(bloc.titre) ||
            !estTexte(bloc.texte) ||
            !estTexte(bloc.description) ||
            !estTexte(bloc.legende) ||
            !estTableau(bloc.elements) ||
            !estTableau(bloc.colonnes) ||
            !estTableau(bloc.lignes)) {
            return false;
        }

        if (!bloc.elements.every(estTexte) ||
            !bloc.colonnes.every(estTexte)) {
            return false;
        }

        if (!bloc.lignes.every((ligne) =>
            estTableau(ligne) && ligne.every(estTexte)
        )) {
            return false;
        }

        if (bloc.type === "table") {
            if (bloc.colonnes.length === 0 ||
                bloc.lignes.length === 0) {
                return false;
            }

            if (!bloc.lignes.every((ligne) =>
                ligne.length === bloc.colonnes.length
            )) {
                return false;
            }
        }

        return true;
    });
}

function validerCours(cours) {
    if (!cours || typeof cours !== "object") {
        return false;
    }

    const champsTexte = [
        "prerequis",
        "objectif_general",
        "trace_ecrite"
    ];

    for (const champ of champsTexte) {
        if (!texteNonVide(cours[champ])) return false;
    }

    if (!estTableau(cours.objectifs_specifiques) ||
        cours.objectifs_specifiques.length === 0) {
        return false;
    }

    if (!cours.objectifs_specifiques.every(texteNonVide)) {
        return false;
    }

    const situation = cours.situation_probleme;
    if (!situation ||
        !texteNonVide(situation.contexte) ||
        !texteNonVide(situation.consigne) ||
        !texteNonVide(situation.question_centrale) ||
        !texteNonVide(situation.production_attendue)) {
        return false;
    }

    const activite = cours.activite_apprentissage;
    if (!activite ||
        !texteNonVide(activite.titre) ||
        !texteNonVide(activite.organisation) ||
        !texteNonVide(activite.consigne) ||
        !estTableau(activite.etapes) ||
        activite.etapes.length === 0 ||
        !texteNonVide(activite.mise_en_commun) ||
        !texteNonVide(activite.institutionnalisation)) {
        return false;
    }

    if (!activite.etapes.every((etape) =>
        etape &&
        (typeof etape.numero === "number" ||
            texteNonVide(etape.numero)) &&
        texteNonVide(etape.description)
    )) {
        return false;
    }

    if (!validerDeroulement(cours.deroulement)) return false;

    if (!estTableau(cours.exercices) ||
        !estTableau(cours.corrections)) {
        return false;
    }

    if (!cours.exercices.every((exercice) =>
        exercice &&
        (typeof exercice.numero === "number" ||
            texteNonVide(exercice.numero)) &&
        texteNonVide(exercice.niveau) &&
        texteNonVide(exercice.enonce)
    )) {
        return false;
    }

    if (!cours.corrections.every((correction) =>
        correction &&
        (typeof correction.numero === "number" ||
            texteNonVide(correction.numero)) &&
        texteNonVide(correction.demarche) &&
        texteNonVide(correction.reponse)
    )) {
        return false;
    }

    const evaluation = cours.evaluation;
    if (!evaluation ||
        !texteNonVide(evaluation.consigne) ||
        !estTableau(evaluation.exercices) ||
        !texteNonVide(evaluation.bareme)) {
        return false;
    }

    if (!evaluation.exercices.every((exercice) =>
        exercice &&
        (typeof exercice.numero === "number" ||
            texteNonVide(exercice.numero)) &&
        texteNonVide(exercice.enonce) &&
        texteNonVide(exercice.bareme)
    )) {
        return false;
    }

    const devoir = cours.devoir;
    if (!devoir ||
        !texteNonVide(devoir.consigne) ||
        !estTableau(devoir.objectifs) ||
        !devoir.objectifs.every(texteNonVide)) {
        return false;
    }

    if (!texteNonVide(cours.justification) ||
        !texteNonVide(cours.materiel_didactique) ||
        !texteNonVide(cours.references)) {
        return false;
    }

    if (!validerTraceStructuree(cours.trace_structuree) ||
        cours.trace_structuree.length === 0) {
        return false;
    }

    return true;
}

function validerExercices(data) {
    if (!data ||
        !texteNonVide(data.titre) ||
        !texteNonVide(data.consigne) ||
        !estTableau(data.exercices) ||
        data.exercices.length === 0) {
        return false;
    }

    return data.exercices.every((exercice) =>
        exercice &&
        (typeof exercice.numero === "number" ||
            texteNonVide(exercice.numero)) &&
        texteNonVide(exercice.niveau) &&
        texteNonVide(exercice.enonce) &&
        texteNonVide(exercice.correction)
    );
}

/* ============================================================
   SCHÉMA STRICT — TRACE ÉCRITE STRUCTURÉE
   ============================================================ */

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
        legende: { type: "string" }
    },
    required: [
        "type",
        "titre",
        "texte",
        "elements",
        "colonnes",
        "lignes",
        "description",
        "legende"
    ]
};

/* ============================================================
   SCHÉMA COMPLET — FICHE PÉDAGOGIQUE
   ============================================================ */

const schemaCours = {
    type: "object",
    additionalProperties: false,
    properties: {
        justification: { type: "string" },
        materiel_didactique: { type: "string" },
        references: { type: "string" },

        prerequis: { type: "string" },
        objectif_general: { type: "string" },

        objectifs_specifiques: {
            type: "array",
            items: { type: "string" }
        },

        situation_probleme: {
            type: "object",
            additionalProperties: false,
            properties: {
                contexte: { type: "string" },
                consigne: { type: "string" },
                question_centrale: { type: "string" },
                production_attendue: { type: "string" }
            },
            required: [
                "contexte",
                "consigne",
                "question_centrale",
                "production_attendue"
            ]
        },

        activite_apprentissage: {
            type: "object",
            additionalProperties: false,
            properties: {
                titre: { type: "string" },
                organisation: { type: "string" },
                consigne: { type: "string" },
                etapes: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            numero: { type: "number" },
                            description: { type: "string" }
                        },
                        required: ["numero", "description"]
                    }
                },
                mise_en_commun: { type: "string" },
                institutionnalisation: { type: "string" }
            },
            required: [
                "titre",
                "organisation",
                "consigne",
                "etapes",
                "mise_en_commun",
                "institutionnalisation"
            ]
        },

        deroulement: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    etape: { type: "string" },
                    duree_minutes: { type: "number" },
                    activite_enseignant: { type: "string" },
                    activite_eleves: { type: "string" }
                },
                required: [
                    "etape",
                    "duree_minutes",
                    "activite_enseignant",
                    "activite_eleves"
                ]
            }
        },

        trace_ecrite: { type: "string" },

        trace_structuree: {
            type: "array",
            items: schemaBlocTrace
        },

        exercices: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    numero: { type: "number" },
                    niveau: { type: "string" },
                    enonce: { type: "string" }
                },
                required: ["numero", "niveau", "enonce"]
            }
        },

        corrections: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    numero: { type: "number" },
                    demarche: { type: "string" },
                    reponse: { type: "string" }
                },
                required: ["numero", "demarche", "reponse"]
            }
        },

        evaluation: {
            type: "object",
            additionalProperties: false,
            properties: {
                consigne: { type: "string" },
                exercices: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            numero: { type: "number" },
                            enonce: { type: "string" },
                            bareme: { type: "string" }
                        },
                        required: ["numero", "enonce", "bareme"]
                    }
                },
                bareme: { type: "string" }
            },
            required: ["consigne", "exercices", "bareme"]
        },

        devoir: {
            type: "object",
            additionalProperties: false,
            properties: {
                consigne: { type: "string" },
                objectifs: {
                    type: "array",
                    items: { type: "string" }
                }
            },
            required: ["consigne", "objectifs"]
        }
    },

    required: [
        "justification",
        "materiel_didactique",
        "references",
        "prerequis",
        "objectif_general",
        "objectifs_specifiques",
        "situation_probleme",
        "activite_apprentissage",
        "deroulement",
        "trace_ecrite",
        "trace_structuree",
        "exercices",
        "corrections",
        "evaluation",
        "devoir"
    ]
};

/* ============================================================
   SCHÉMA DES EXERCICES
   ============================================================ */

const schemaExercices = {
    type: "object",
    additionalProperties: false,
    properties: {
        titre: { type: "string" },
        consigne: { type: "string" },
        exercices: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    numero: { type: "number" },
                    niveau: { type: "string" },
                    enonce: { type: "string" },
                    correction: { type: "string" }
                },
                required: [
                    "numero",
                    "niveau",
                    "enonce",
                    "correction"
                ]
            }
        }
    },
    required: ["titre", "consigne", "exercices"]
};

/* ============================================================
   APPEL COMMUN À L'API OPENAI
   ============================================================ */

async function appelerOpenAI(instructions, schema, nomSchema) {
    if (!OPENAI_API_KEY) {
        throw new Error(
            "La variable OPENAI_API_KEY n'est pas configurée dans Render."
        );
    }

    const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODELE_IA,
                instructions: instructions,
                input: "Produis le résultat demandé en respectant strictement le schéma JSON.",
                text: {
                    format: {
                        type: "json_schema",
                        name: nomSchema,
                        strict: true,
                        schema: schema
                    }
                }
            })
        }
    );

    const resultat = await response.json();

    if (!response.ok) {
        const detail = resultat &&
            resultat.error &&
            resultat.error.message
            ? resultat.error.message
            : JSON.stringify(resultat);

        throw new Error(`Erreur API OpenAI : ${detail}`);
    }

    let texte = resultat.output_text;

    if (!texte && Array.isArray(resultat.output)) {
        for (const element of resultat.output) {
            if (!Array.isArray(element.content)) continue;

            for (const contenu of element.content) {
                if (contenu.type === "output_text" &&
                    typeof contenu.text === "string") {
                    texte = contenu.text;
                    break;
                }
            }

            if (texte) break;
        }
    }

    if (!texte) {
        throw new Error(
            "La réponse de l'IA ne contient aucun texte JSON exploitable."
        );
    }

    try {
        return JSON.parse(texte);
    } catch (erreur) {
        throw new Error(
            "Impossible de lire le JSON retourné par l'IA."
        );
    }
}

/* ============================================================
   CONSIGNES PÉDAGOGIQUES COMMUNES
   ============================================================ */

function construireInstructionsCours(requete) {
    return `
Tu es un spécialiste expérimenté de la pédagogie, de la didactique
et des programmes scolaires du Niger.

Tu prépares une fiche de cours professionnelle destinée aux enseignants
et aux élèves. Respecte strictement la classe, la matière, le thème,
le niveau et les informations fournis dans la demande.

DEMANDE DE L'UTILISATEUR :
${requete}

RÈGLES GÉNÉRALES :
1. Rédige en français clair, correct et adapté au niveau des élèves.
2. Respecte la discipline et ses méthodes propres.
3. Ne prétends pas qu'un contenu est officiel si tu ne peux pas le vérifier.
4. N'invente ni objectifs officiels, ni pages de manuels, ni auteurs,
   ni titres d'ouvrages, ni références bibliographiques.
5. Si aucune référence vérifiable n'est connue, indique honnêtement :
   "Référence bibliographique à compléter avec le manuel réellement utilisé."
6. La justification explique l'intérêt de la leçon, son utilité et,
   lorsque c'est pertinent, son lien avec la vie quotidienne.
7. Le matériel didactique doit être concret, réaliste et adapté
   aux ressources d'un établissement, y compris en milieu rural.
8. Les objectifs spécifiques doivent être observables et évaluables.
9. Le déroulement doit distinguer les actions de l'enseignant
   et celles des élèves, avec une durée en minutes.
10. Les exercices et corrections doivent correspondre au cours.
11. Ne produis pas de fausses images, d'URL inventées ou de sources fictives.
12. N'utilise pas de balises HTML ni de Markdown dans les champs textuels.
13. Utilise une notation scientifique lisible en texte simple si nécessaire.
14. Évite les répétitions inutiles et les formulations vagues.

RÈGLES POUR LA TRACE ÉCRITE :
La trace écrite doit être un résumé complet, clair, rigoureux et directement
exploitable par l'élève dans son cahier.

Remplis DEUX champs :
- trace_ecrite : version textuelle complète de secours.
- trace_structuree : la même trace, découpée dans l'ordre exact d'affichage
  en blocs structurés.

Chaque bloc de trace_structuree doit renseigner TOUS les champs du schéma.
Pour les champs inutilisés, utilise une chaîne vide ou un tableau vide.

Types de blocs autorisés :
- heading : titre principal de la trace ;
- subheading : titre d'une partie ;
- paragraph : définition, règle, explication ou exemple ;
- list : liste de propriétés, étapes, caractéristiques ou éléments ;
- table : vrai tableau avec colonnes et lignes ;
- diagram : description précise d'un schéma, d'une figure ou d'un graphique.

Pour une table, renseigne colonnes et lignes. Chaque ligne doit comporter
exactement autant de cellules que le nombre de colonnes.
Pour un diagram, décris précisément les éléments, leurs positions,
leurs relations et les légendes dans le champ description. Le diagram
est une description exploitable par l'application, pas un fichier image.
Ne crée un tableau ou un schéma que s'il améliore réellement la compréhension.

ADAPTATION À LA MATIÈRE :
- Mathématiques : définitions, propriétés, formules, étapes de calcul,
  exemples corrigés et tableaux de valeurs si utiles.
- Sciences physiques : grandeurs, unités, lois, matériel, protocole,
  observations et interprétation si le thème le nécessite.
- SVT : organes, structures, fonctions, étapes biologiques, tableaux
  comparatifs et descriptions de schémas scientifiques si pertinents.
- Français et langues : notions, règles, exemples, vocabulaire et tableaux
  grammaticaux si utiles.
- Histoire-géographie : dates, événements, lieux, causes, conséquences,
  chronologies, tableaux et descriptions de cartes ou de croquis pertinents.
- Éducation civique et morale : notions, principes, exemples concrets
  et comportements attendus.
- Autres disciplines : applique les méthodes propres à la matière.

Ne force pas une formule mathématique ou un tableau dans toutes les leçons.
N'ajoute pas de diagramme décoratif. Le contenu doit être scientifiquement
et pédagogiquement correct.

La situation-problème doit être adaptée au contexte des élèves.
L'activité d'apprentissage doit expliquer comment les élèves construisent
leurs connaissances et comment l'enseignant les accompagne.

Les exercices doivent progresser du simple au complexe. Les corrections
doivent détailler les démarches, pas seulement donner les résultats.

L'évaluation doit permettre de vérifier les objectifs annoncés.
Le devoir doit être faisable avec les moyens accessibles aux élèves.

Retourne exclusivement les données correspondant au schéma JSON demandé.
`;
}

/* ============================================================
   GÉNÉRATION D'UN COURS
   ============================================================ */

app.post("/generer-cours", async (req, res) => {
    try {
        const requete = req.body && req.body.requete;

        if (!texteNonVide(requete)) {
            return res.status(400).json({
                success: false,
                erreur: "La requête de génération du cours est manquante."
            });
        }

        const instructions = construireInstructionsCours(requete);

        const cours = await appelerOpenAI(
            instructions,
            schemaCours,
            "fiche_pedagogique_cifon"
        );

        if (!validerCours(cours)) {
            console.error(
                "Cours rejeté : champs manquants ou structure incorrecte."
            );

            return res.status(502).json({
                success: false,
                erreur:
                    "La fiche générée est incomplète ou mal structurée. Réessaie."
            });
        }

        return res.json({
            success: true,
            cours: cours,
            serveur: "CIFON Pédagogie Niger",
            version: VERSION
        });

    } catch (erreur) {
        console.error("Erreur /generer-cours :", erreur.message);

        return res.status(500).json({
            success: false,
            erreur: "Échec de la génération du cours.",
            details: erreur.message
        });
    }
});

/* ============================================================
   GÉNÉRATION D'EXERCICES CORRIGÉS
   ============================================================ */

app.post("/generer-exercices", async (req, res) => {
    try {
        const requete = req.body && req.body.requete;

        if (!texteNonVide(requete)) {
            return res.status(400).json({
                success: false,
                erreur:
                    "La demande de génération des exercices est manquante."
            });
        }

        const instructions = `
Tu es un spécialiste de la conception d'exercices scolaires
et de leurs corrections, adapté au système éducatif du Niger.

DEMANDE :
${requete}

RÈGLES :
1. Respecte la classe, la matière et le thème demandés.
2. Propose des exercices progressifs et adaptés au niveau.
3. Chaque exercice doit avoir un énoncé compréhensible.
4. Chaque correction doit présenter une démarche suffisamment détaillée.
5. Vérifie les calculs, les unités, les réponses et la cohérence scientifique.
6. N'invente pas de références bibliographiques.
7. N'utilise pas de balises HTML ni de Markdown.
8. Retourne uniquement le JSON correspondant au schéma.
`;

        const exercices = await appelerOpenAI(
            instructions,
            schemaExercices,
            "exercices_corriges_cifon"
        );

        if (!validerExercices(exercices)) {
            return res.status(502).json({
                success: false,
                erreur:
                    "Les exercices générés sont incomplets. Réessaie."
            });
        }

        return res.json({
            success: true,
            exercices: exercices,
            serveur: "CIFON Pédagogie Niger",
            version: VERSION
        });

    } catch (erreur) {
        console.error("Erreur /generer-exercices :", erreur.message);

        return res.status(500).json({
            success: false,
            erreur: "Échec de la génération des exercices.",
            details: erreur.message
        });
    }
});

/* ============================================================
   GESTION DES ROUTES INCONNUES
   ============================================================ */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        erreur: "Route introuvable.",
        chemin: req.path
    });
});

/* ============================================================
   DÉMARRAGE DU SERVEUR
   ============================================================ */

app.listen(PORT, () => {
    console.log(
        `CIFON Pédagogie Niger — version ${VERSION} — port ${PORT}`
    );

    console.log(
        `Clé API configurée : ${Boolean(OPENAI_API_KEY)}`
    );
});
