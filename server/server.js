// ============================================================
// CIFON PÉDAGOGIE NIGER
// SERVEUR DE GÉNÉRATION DE COURS
// VERSION 2.0.0
// ============================================================

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const VERSION = "2.0.0";

const NOM_SERVEUR = "CIFON PÉDAGOGIE NIGER";


// ============================================================
// CONFIGURATION EXPRESS
// ============================================================

app.use(express.json({ limit: "1mb" }));


// ============================================================
// PAGE D'ACCUEIL
// ============================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Serveur CIFON PÉDAGOGIE NIGER opérationnel.",
        serveur: NOM_SERVEUR,
        version: VERSION
    });

});


// ============================================================
// TEST DE SANTÉ
// ============================================================

app.get("/sante", (req, res) => {

    res.json({
        success: true,
        message: "Le serveur fonctionne correctement.",
        serveur: NOM_SERVEUR,
        version: VERSION
    });

});


// ============================================================
// TEST OPENAI
// ============================================================

app.get("/test-generation", async (req, res) => {

    try {

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || apiKey.trim() === "") {

            return res.status(500).json({
                success: false,
                erreur: "OPENAI_API_KEY n'est pas configurée.",
                serveur: NOM_SERVEUR,
                version: VERSION
            });

        }


        const requeteTest = `
Classe : 6e

Matière : Mathématiques

Thème : Géométrie

Chapitre : Le cube et le pavé droit

Leçon : Le cube et le pavé droit

Objectifs :
Identifier les faces, les arêtes et les sommets d'un cube et d'un pavé droit.

Durée : 55 minutes
`;


        const resultat = await genererAvecOpenAI(
            requeteTest,
            apiKey
        );


        return res.json({
            success: true,
            message:
                "La connexion CIFON → Render → OpenAI fonctionne.",
            cours: resultat,
            serveur: NOM_SERVEUR,
            version: VERSION
        });


    } catch (erreur) {

        console.error(
            "ERREUR /test-generation :",
            erreur
        );

        return res.status(500).json({
            success: false,
            erreur: obtenirMessageErreur(erreur),
            serveur: NOM_SERVEUR,
            version: VERSION
        });

    }

});


// ============================================================
// GENERATION D'UN COURS
// ============================================================

app.post("/generer-cours", async (req, res) => {

    try {

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || apiKey.trim() === "") {

            return res.status(500).json({
                success: false,
                erreur: "OPENAI_API_KEY n'est pas configurée.",
                serveur: NOM_SERVEUR,
                version: VERSION
            });

        }


        const requete = req.body
            ? req.body.requete
            : null;


        if (
            !requete ||
            typeof requete !== "string" ||
            requete.trim() === ""
        ) {

            return res.status(400).json({
                success: false,
                erreur:
                    "La requête de génération est obligatoire.",
                serveur: NOM_SERVEUR,
                version: VERSION
            });

        }


        console.log(
            "Nouvelle demande de génération reçue."
        );


        const cours = await genererAvecOpenAI(
            requete,
            apiKey
        );


        return res.json({
            success: true,
            cours: cours,
            serveur: NOM_SERVEUR,
            version: VERSION
        });


    } catch (erreur) {

        console.error(
            "ERREUR /generer-cours :",
            erreur
        );

        return res.status(500).json({
            success: false,
            erreur: obtenirMessageErreur(erreur),
            serveur: NOM_SERVEUR,
            version: VERSION
        });

    }

});


// ============================================================
// FONCTION PRINCIPALE OPENAI
// ============================================================

async function genererAvecOpenAI(
    requete,
    apiKey
) {

    const instructions = `
Tu es un expert international en ingénierie pédagogique,
en didactique des disciplines scolaires et en conception
de fiches pédagogiques.

Tu travailles pour l'application :

CIFON PÉDAGOGIE NIGER

Ta mission est de produire une fiche pédagogique
professionnelle, réaliste, directement exploitable par
un enseignant du Niger.

IMPORTANT :

1. Respecte strictement les informations du programme
   officiel fournies dans la demande.

2. Ne change pas le thème, le chapitre ou le contenu
   officiel fourni.

3. Ne crée pas un contenu qui dépasse inutilement le niveau
   de la classe.

4. Les objectifs doivent être observables et évaluables.

5. Les activités doivent permettre réellement aux élèves
   de construire les apprentissages.

6. La situation-problème doit être adaptée au niveau
   des élèves et liée à la notion étudiée.

7. L'enseignant doit avoir un rôle précis.

8. Les élèves doivent avoir des tâches précises.

9. Le déroulement doit respecter la durée indiquée.

10. Les exercices doivent être directement liés aux objectifs.

11. Les corrections doivent expliquer clairement la démarche.

12. L'évaluation doit vérifier les apprentissages visés.

13. Le devoir doit être cohérent avec la leçon.

14. Ne jamais inventer une référence officielle.

15. Ne jamais prétendre qu'une information vient du
    programme officiel si elle n'est pas fournie.

16. Utilise un français pédagogique clair et correct.

17. Adapte le vocabulaire à l'âge des élèves.

18. Ne produis pas de Markdown.

19. Ne produis pas de caractères Markdown comme :
    **
    #
    ---
    | | |

20. Ne produis pas de code LaTeX.

21. Pour les fractions, utilise par exemple :
    3/4

22. Pour les puissances, utilise par exemple :
    x²

23. Pour les racines, utilise par exemple :
    √25

24. Évite les formulations artificielles ou trop générales.

25. La fiche doit être utilisable par un véritable enseignant
    dans une salle de classe.

26. Les durées du déroulement doivent être cohérentes avec
    la durée totale de la séance.

27. La progression doit aller du rappel des prérequis vers
    la découverte, la construction, l'institutionnalisation,
    l'application puis l'évaluation.

28. Les exercices doivent comporter des niveaux de difficulté
    progressifs.

29. Les corrections doivent être suffisamment détaillées
    pour permettre à l'enseignant de les utiliser.

30. Si une donnée pédagogique importante manque dans la
    demande, fais une proposition raisonnable adaptée au
    contexte scolaire nigérien sans modifier les données
    officielles fournies.
`;


    const schema = {

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

                                numero: {
                                    type: "integer"
                                },

                                description: {
                                    type: "string"
                                }

                            },

                            required: [
                                "numero",
                                "description"
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

                            type: "object",

                            additionalProperties: false,

                            properties: {

                                numero: {
                                    type: "integer"
                                },

                                enonce: {
                                    type: "string"
                                },

                                bareme: {
                                    type: "integer"
                                }

                            },

                            required: [
                                "numero",
                                "enonce",
                                "bareme"
                            ]

                        }

                    },

                    bareme: {
                        type: "integer"
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

                        type: "array",

                        items: {
                            type: "string"
                        }

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


    const corps = {

        model: "gpt-6-luna",

        instructions: instructions,

        input:
            "Voici les informations fournies par l'application :\n\n"
            + requete
            + "\n\n"
            + "Produis maintenant la fiche pédagogique complète.",

        text: {

            format: {

                type: "json_schema",

                name: "fiche_pedagogique_cifon",

                strict: true,

                schema: schema

            }

        }

    };


    console.log(
        "Envoi de la demande à OpenAI..."
    );


    const reponse = await fetch(
        "https://api.openai.com/v1/responses",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    "Bearer " + apiKey.trim()

            },

            body: JSON.stringify(corps)

        }
    );


    const texteReponse =
        await reponse.text();


    if (!reponse.ok) {

        console.error(
            "Réponse OpenAI :",
            texteReponse
        );

        let message =
            "Erreur lors de la communication avec OpenAI.";

        try {

            const erreurJSON =
                JSON.parse(texteReponse);

            if (
                erreurJSON &&
                erreurJSON.error &&
                erreurJSON.error.message
            ) {

                message =
                    erreurJSON.error.message;

            }

        } catch (e) {

            if (
                texteReponse &&
                texteReponse.trim() !== ""
            ) {

                message =
                    texteReponse;

            }

        }

        throw new Error(message);

    }


    let donnees;

    try {

        donnees =
            JSON.parse(texteReponse);

    } catch (e) {

        console.error(
            "Réponse OpenAI non JSON :",
            texteReponse
        );

        throw new Error(
            "La réponse reçue d'OpenAI n'est pas valide."
        );

    }


    // ========================================================
    // EXTRACTION DU TEXTE STRUCTURÉ
    // ========================================================

    let texteCours = "";


    if (
        typeof donnees.output_text === "string" &&
        donnees.output_text.trim() !== ""
    ) {

        texteCours =
            donnees.output_text.trim();

    }


    if (
        !texteCours &&
        Array.isArray(donnees.output)
    ) {

        for (
            const element of donnees.output
        ) {

            if (
                !element ||
                !Array.isArray(element.content)
            ) {

                continue;

            }


            for (
                const contenu of element.content
            ) {

                if (
                    contenu &&
                    typeof contenu.text === "string"
                ) {

                    texteCours +=
                        contenu.text;

                }

            }

        }

    }


    if (!texteCours) {

        console.error(
            "Réponse OpenAI complète :",
            JSON.stringify(donnees, null, 2)
        );

        throw new Error(
            "OpenAI a répondu mais aucun contenu de cours n'a été reçu."
        );

    }


    // ========================================================
    // CONVERSION DU JSON DU COURS
    // ========================================================

    let coursStructure;

    try {

        coursStructure =
            JSON.parse(texteCours);

    } catch (e) {

        console.error(
            "Cours reçu non JSON :",
            texteCours
        );

        throw new Error(
            "Le cours généré n'a pas le format structuré attendu."
        );

    }


    return coursStructure;

}


// ============================================================
// GESTION DES ERREURS
// ============================================================

function obtenirMessageErreur(erreur) {

    if (!erreur) {

        return "Erreur inconnue.";

    }


    if (erreur.message) {

        return erreur.message;

    }


    return String(erreur);

}


// ============================================================
// DEMARRAGE DU SERVEUR
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            "================================================"
        );

        console.log(
            NOM_SERVEUR
        );

        console.log(
            "Serveur démarré sur le port : "
            + PORT
        );

        console.log(
            "Version : "
            + VERSION
        );

        console.log(
            "================================================"
        );

    }
);
