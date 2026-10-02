// ============================================================
// CIFON PÉDAGOGIE NIGER
// SERVEUR DE GÉNÉRATION DE COURS
// Version pédagogique structurée
// ============================================================

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

const VERSION = "2.0.0";

const NOM_SERVEUR = "CIFON PÉDAGOGIE NIGER";

const OPENAI_API_URL =
    "https://api.openai.com/v1/responses";

const MODELE_OPENAI = "gpt-6-luna";

// ============================================================
// MIDDLEWARES
// ============================================================

app.use(cors());

app.use(
    express.json({
        limit: "2mb"
    })
);

// ============================================================
// ROUTE PRINCIPALE
// ============================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        serveur: NOM_SERVEUR,
        version: VERSION,
        message:
            "Serveur CIFON PÉDAGOGIE NIGER opérationnel."
    });

});

// ============================================================
// ROUTE DE SANTÉ
// ============================================================

app.get("/sante", (req, res) => {

    res.json({
        success: true,
        serveur: NOM_SERVEUR,
        version: VERSION,
        statut: "OK"
    });

});

// ============================================================
// TEST SIMPLE DE GÉNÉRATION
// ============================================================

app.get("/test-generation", async (req, res) => {

    try {

        const apiKey =
            (process.env.OPENAI_API_KEY || "").trim();

        if (!apiKey) {

            return res.status(500).json({
                success: false,
                erreur:
                    "OPENAI_API_KEY n'est pas configurée."
            });

        }

        const instructions = `
Tu es un expert en pédagogie scolaire.

Tu dois produire une mini-leçon destinée à des élèves
de 6e au Niger.

Retourne uniquement un objet JSON correspondant
exactement à la structure demandée.

Le contenu doit être clair, correct et directement
utilisable par un enseignant.

N'utilise pas de Markdown.
N'utilise pas de LaTeX.
N'utilise pas de symboles comme \\frac, \\[ ou \\].
Les fractions doivent être écrites sous forme simple :
3/2, 8/10, etc.

Le contenu doit être en français.
`;

        const input = `
Classe : 6e
Matière : Mathématiques
Thème : Géométrie
Leçon : Le cube et le pavé droit
Contenu officiel : reconnaître les faces, les arêtes
et les sommets du cube et du pavé droit.
Durée : 55 minutes.
`;

        const reponse = await appelerOpenAI(
            apiKey,
            instructions,
            input
        );

        return res.json({
            success: true,
            message:
                "La connexion CIFON → Render → OpenAI fonctionne.",
            cours: reponse,
            serveur: NOM_SERVEUR,
            version: VERSION
        });

    } catch (erreur) {

        console.error(
            "ERREUR TEST GENERATION :",
            erreur
        );

        return res.status(500).json({
            success: false,
            erreur:
                obtenirMessageErreur(erreur)
        });

    }

});

// ============================================================
// GÉNÉRATION D'UN COURS
// ============================================================

app.post("/generer-cours", async (req, res) => {

    try {

        const apiKey =
            (process.env.OPENAI_API_KEY || "").trim();

        if (!apiKey) {

            return res.status(500).json({
                success: false,
                erreur:
                    "OPENAI_API_KEY n'est pas configurée."
            });

        }

        const requete =
            req.body &&
            typeof req.body.requete === "string"
                ? req.body.requete.trim()
                : "";

        if (!requete) {

            return res.status(400).json({
                success: false,
                erreur:
                    "La requête de génération est vide."
            });

        }

        console.log(
            "================================================"
        );

        console.log(
            "NOUVELLE DEMANDE DE GÉNÉRATION"
        );

        console.log(
            requete
        );

        console.log(
            "================================================"
        );

        // ----------------------------------------------------
        // INSTRUCTIONS EXPERTES
        // ----------------------------------------------------

        const instructions = `
Tu es CIFON PÉDAGOGIE NIGER,
un assistant expert en sciences de l'éducation,
en didactique et en préparation de cours scolaires.

Ta mission est de transformer les informations
du programme officiel fournies par l'application
en une fiche pédagogique de haute qualité.

==================================================
RÈGLE FONDAMENTALE
==================================================

Le contenu officiel fourni par l'application
est la référence principale.

Tu ne dois pas inventer un nouveau contenu
qui s'éloigne du programme.

Tu peux organiser, expliquer, illustrer et
pédagogiser le contenu fourni.

Tu dois respecter :

- le niveau ;
- la classe ;
- la série lorsqu'elle existe ;
- la matière ;
- le thème ;
- le chapitre ;
- le contenu officiel ;
- les objectifs spécifiques ;
- la durée de la séance.

==================================================
QUALITÉ PÉDAGOGIQUE
==================================================

Le cours doit être conçu comme une véritable
préparation de séance destinée à un enseignant.

Les objectifs doivent être observables et évaluables.

La situation-problème doit être liée à la leçon.

L'activité doit permettre aux élèves de chercher,
raisonner, manipuler, observer, produire ou expliquer
selon la matière.

L'enseignant doit accompagner les élèves sans donner
immédiatement la réponse lorsque la démarche
de découverte est appropriée.

La mise en commun doit permettre de comparer
les productions.

L'institutionnalisation doit faire apparaître
clairement la connaissance ou la règle à retenir.

Les exercices doivent être cohérents avec
ce qui a été enseigné.

Les corrections doivent expliquer la démarche
et pas seulement donner la réponse.

L'évaluation doit mesurer les objectifs annoncés.

Le devoir doit prolonger raisonnablement
l'apprentissage.

==================================================
ADAPTATION AU NIVEAU
==================================================

Le vocabulaire doit être adapté à l'âge des élèves.

Les exemples doivent être compréhensibles
dans le contexte scolaire nigérien lorsque cela
est pertinent.

Évite les formulations artificielles ou trop
universitaires destinées aux élèves.

==================================================
MATHÉMATIQUES
==================================================

Pour les mathématiques :

- les calculs doivent être vérifiés ;
- les résultats doivent être exacts ;
- les étapes de résolution doivent être explicites ;
- les fractions doivent être écrites sous forme simple,
  par exemple 3/2 ou 15/10 ;
- ne produis jamais de LaTeX ;
- ne produis jamais \\frac ;
- ne produis jamais \\[ ou \\] ;
- n'utilise pas de Markdown pour les formules.

Exemple :

Correct :
1,5 = 15/10 = 3/2

Incorrect :
\\[
1,5 = \\frac{15}{10} = \\frac{3}{2}
\\]

==================================================
FORMAT DE LA FICHE
==================================================

Tu dois produire exactement les parties suivantes :

1. Prérequis / rappel
2. Objectif général
3. Objectifs spécifiques
4. Situation-problème
5. Activité d'apprentissage
6. Déroulement de la séance
7. Trace écrite / résumé
8. Exercices d'application
9. Correction des exercices
10. Évaluation et devoir

==================================================
DÉROULEMENT
==================================================

Le déroulement doit comporter plusieurs étapes.

Chaque étape doit préciser :

- étape ;
- durée ;
- activités de l'enseignant ;
- activités des élèves.

La somme des durées doit correspondre
à la durée totale demandée.

==================================================
EXERCICES
==================================================

Lorsque cela est pertinent, proposer des exercices
de difficulté progressive :

- application directe ;
- application ;
- consolidation ;
- raisonnement ou problème.

Les exercices doivent être adaptés au niveau.

==================================================
CORRECTIONS
==================================================

Chaque correction doit expliquer la démarche.

Ne donne pas seulement :

Réponse : 4/5

Mais explique :

0,8 possède un chiffre après la virgule.
On utilise donc 10 comme dénominateur.
0,8 = 8/10.
On simplifie par 2.
8/10 = 4/5.

Réponse : 4/5.

==================================================
ÉVALUATION
==================================================

L'évaluation doit être indépendante des exemples
utilisés pendant l'apprentissage tout en vérifiant
les mêmes objectifs.

==================================================
STYLE
==================================================

Le français doit être correct, simple et professionnel.

Ne commence pas par une introduction inutile.

Ne termine pas par une phrase du type :
"J'espère que ce cours vous aidera."

==================================================
SORTIE OBLIGATOIRE
==================================================

Retourne uniquement les données correspondant
au schéma JSON demandé.

Aucun texte avant le JSON.
Aucun texte après le JSON.
`;

        // ----------------------------------------------------
        // APPEL OPENAI
        // ----------------------------------------------------

        const cours =
            await appelerOpenAI(
                apiKey,
                instructions,
                requete
            );

        console.log(
            "GÉNÉRATION TERMINÉE AVEC SUCCÈS."
        );

        // ----------------------------------------------------
        // RÉPONSE AU TÉLÉPHONE ANDROID
        // ----------------------------------------------------

        return res.json({

            success: true,

            cours: cours,

            serveur: NOM_SERVEUR,

            version: VERSION

        });

    } catch (erreur) {

        console.error(
            "================================================"
        );

        console.error(
            "ERREUR GÉNÉRATION :"
        );

        console.error(
            erreur
        );

        console.error(
            "================================================"
        );

        return res.status(500).json({

            success: false,

            erreur:
                obtenirMessageErreur(erreur),

            serveur: NOM_SERVEUR,

            version: VERSION

        });

    }

});

// ============================================================
// FONCTION APPEL OPENAI
// ============================================================

async function appelerOpenAI(
    apiKey,
    instructions,
    input
) {

    const schema =
        construireSchemaFichePedagogique();

    const corps = {

        model: MODELE_OPENAI,

        instructions: instructions,

        input: input,

        text: {

            format: {

                type: "json_schema",

                name: "fiche_pedagogique_cifon",

                strict: true,

                schema: schema

            }

        }

    };

    const reponse =
        await fetch(
            OPENAI_API_URL,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + apiKey

                },

                body:
                    JSON.stringify(corps)

            }
        );

    const texte =
        await reponse.text();

    let donnees;

    try {

        donnees =
            JSON.parse(texte);

    } catch (e) {

        throw new Error(
            "Réponse OpenAI non valide : " +
            texte.substring(0, 1000)
        );

    }

    if (!reponse.ok) {

        console.error(
            "Réponse API OpenAI :",
            donnees
        );

        const message =
            donnees &&
            donnees.error &&
            donnees.error.message
                ? donnees.error.message
                : "Erreur inconnue de l'API OpenAI.";

        throw new Error(
            "OpenAI : " + message
        );

    }

    // --------------------------------------------------------
    // EXTRACTION DE LA SORTIE
    // --------------------------------------------------------

    let contenu = "";

    if (
        donnees &&
        typeof donnees.output_text === "string"
    ) {

        contenu =
            donnees.output_text.trim();

    }

    // --------------------------------------------------------
    // COMPATIBILITÉ AVEC LA STRUCTURE OUTPUT
    // --------------------------------------------------------

    if (!contenu && Array.isArray(donnees.output)) {

        for (
            const element
            of donnees.output
        ) {

            if (
                !element ||
                !Array.isArray(element.content)
            ) {
                continue;
            }

            for (
                const partie
                of element.content
            ) {

                if (
                    partie &&
                    typeof partie.text === "string"
                ) {

                    contenu +=
                        partie.text;

                }

            }

        }

        contenu =
            contenu.trim();

    }

    if (!contenu) {

        throw new Error(
            "OpenAI a répondu, mais aucun contenu n'a été reçu."
        );

    }

    // --------------------------------------------------------
    // TRANSFORMATION JSON
    // --------------------------------------------------------

    let objet;

    try {

        objet =
            JSON.parse(contenu);

    } catch (e) {

        console.error(
            "Contenu reçu non JSON :",
            contenu
        );

        throw new Error(
            "L'IA a retourné un format inattendu. " +
            "Le cours n'a pas pu être structuré."
        );

    }

    return objet;

}

// ============================================================
// SCHÉMA DE LA FICHE PÉDAGOGIQUE
// ============================================================

function construireSchemaFichePedagogique() {

    return {

        type: "object",

        additionalProperties: false,

        properties: {

            prerequis: {

                type: "string"

            },

            objectif_general: {

                type: "string"

            },

            objectifs_specifiques: {

                type: "array",

                items: {

                    type: "string"

                }

            },

            situation_probleme: {

                type: "object",

                additionalProperties: false,

                properties: {

                    contexte: {
                        type: "string"
                    },

                    consigne: {
                        type: "string"
                    },

                    question_centrale: {
                        type: "string"
                    },

                    production_attendue: {
                        type: "string"
                    }

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

                    titre: {
                        type: "string"
                    },

                    organisation: {
                        type: "string"
                    },

                    consigne: {
                        type: "string"
                    },

                    etapes: {

                        type: "array",

                        items: {

                            type: "object",

                            additionalProperties: false,

                            properties: {

                                etape: {
                                    type: "string"
                                },

                                enseignant: {
                                    type: "string"
                                },

                                eleves: {
                                    type: "string"
                                }

                            },

                            required: [

                                "etape",
                                "enseignant",
                                "eleves"

                            ]

                        }

                    },

                    mise_en_commun: {
                        type: "string"
                    },

                    institutionnalisation: {
                        type: "string"
                    }

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

                        etape: {
                            type: "string"
                        },

                        duree_minutes: {
                            type: "integer"
                        },

                        activite_enseignant: {
                            type: "string"
                        },

                        activite_eleves: {
                            type: "string"
                        }

                    },

                    required: [

                        "etape",
                        "duree_minutes",
                        "activite_enseignant",
                        "activite_eleves"

                    ]

                }

            },

            trace_ecrite: {

                type: "string"

            },

            exercices: {

                type: "array",

                items: {

                    type: "object",

                    additionalProperties: false,

                    properties: {

                        numero: {
                            type: "integer"
                        },

                        niveau: {
                            type: "string"
                        },

                        enonce: {
                            type: "string"
                        }

                    },

                    required: [

                        "numero",
                        "niveau",
                        "enonce"

                    ]

                }

            },

            corrections: {

                type: "array",

                items: {

                    type: "object",

                    additionalProperties: false,

                    properties: {

                        numero: {
                            type: "integer"
                        },

                        demarche: {
                            type: "string"
                        },

                        reponse: {
                            type: "string"
                        }

                    },

                    required: [

                        "numero",
                        "demarche",
                        "reponse"

                    ]

                }

            },

            evaluation: {

                type: "object",

                additionalProperties: false,

                properties: {

                    consigne: {
                        type: "string"
                    },

                    exercices: {

                        type: "array",

                        items: {

                            type: "string"

                        }

                    },

                    bareme: {
                        type: "string"
                    }

                },

                required: [

                    "consigne",
                    "exercices",
                    "bareme"

                ]

            },

            devoir: {

                type: "object",

                additionalProperties: false,

                properties: {

                    consigne: {
                        type: "string"
                    },

                    objectifs: {
                        type: "string"
                    }

                },

                required: [

                    "consigne",
                    "objectifs"

                ]

            }

        },

        required: [

            "prerequis",
            "objectif_general",
            "objectifs_specifiques",
            "situation_probleme",
            "activite_apprentissage",
            "deroulement",
            "trace_ecrite",
            "exercices",
            "corrections",
            "evaluation",
            "devoir"

        ]

    };

}

// ============================================================
// GESTION DES ERREURS
// ============================================================

function obtenirMessageErreur(erreur) {

    if (!erreur) {

        return "Erreur inconnue.";

    }

    if (
        typeof erreur.message === "string" &&
        erreur.message.trim()
    ) {

        return erreur.message.trim();

    }

    return String(erreur);

}

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================================"
        );

        console.log(
            NOM_SERVEUR
        );

        console.log(
            "Version : " + VERSION
        );

        console.log(
            "Port : " + PORT
        );

        console.log(
            "Modèle : " + MODELE_OPENAI
        );

        console.log(
            "================================================"
        );

    }
);
