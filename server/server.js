// ============================================================
// CIFON PÉDAGOGIE NIGER
// SERVEUR DE GÉNÉRATION DE COURS ET D'EXERCICES
// VERSION 2.3.0
// ============================================================

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const VERSION = "2.3.0";

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
            "Nouvelle demande de génération de cours reçue."
        );


        const cours = await genererAvecOpenAI(
            requete,
            apiKey
        );


        // Validation du cours avant envoi à Android
        validerCours(cours);


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
// GENERATION D'UNE SERIE D'EXERCICES
// AVEC CORRECTION POUR CHAQUE EXERCICE
// ============================================================

app.post("/generer-exercices", async (req, res) => {

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
                    "La requête de génération des exercices est obligatoire.",
                serveur: NOM_SERVEUR,
                version: VERSION
            });

        }


        console.log(
            "Nouvelle demande de génération d'exercices reçue."
        );


        const exercices =
            await genererExercicesAvecOpenAI(
                requete,
                apiKey
            );


        // ====================================================
        // VALIDATION OBLIGATOIRE
        // ====================================================

        validerExercices(exercices);


        console.log(
            "Série d'exercices validée avec corrections."
        );


        return res.json({

            success: true,

            exercices: exercices,

            serveur: NOM_SERVEUR,

            version: VERSION

        });


    } catch (erreur) {

        console.error(
            "ERREUR /generer-exercices :",
            erreur
        );


        return res.status(500).json({

            success: false,

            erreur:
                obtenirMessageErreur(erreur),

            serveur:
                NOM_SERVEUR,

            version:
                VERSION

        });

    }

});


// ============================================================
// FONCTION PRINCIPALE OPENAI - COURS
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


============================================================
RÈGLES GÉNÉRALES
============================================================

1. Respecte strictement les informations du programme
   officiel fournies dans la demande.

2. Ne change pas le thème, le chapitre ou le contenu
   officiel fourni.

3. Ne crée pas un contenu qui dépasse inutilement le niveau
   de la classe.

4. Les objectifs officiels fournis par l'application
   doivent être respectés.

5. Ne prétends jamais qu'une information vient du programme
   officiel si elle n'est pas fournie.

6. La situation-problème doit être adaptée au niveau
   des élèves et liée à la notion étudiée.

7. Les activités doivent permettre réellement aux élèves
   de construire les apprentissages.

8. L'enseignant doit avoir un rôle précis.

9. Les élèves doivent avoir des tâches précises.

10. Le déroulement doit respecter la durée indiquée.

11. Les exercices doivent être directement liés aux objectifs.

12. Les corrections doivent expliquer clairement la démarche.

13. L'évaluation doit vérifier les apprentissages visés.

14. Le devoir doit être cohérent avec la leçon.

15. Ne jamais inventer une référence officielle.

16. Utilise un français pédagogique clair et correct.

17. Adapte le vocabulaire à l'âge des élèves.

18. Ne produis pas de Markdown.

19. Ne produis pas de caractères Markdown.

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


============================================================
SÉPARATION ENSEIGNANT / ÉLÈVES
============================================================

Dans "activite_enseignant", mettre UNIQUEMENT les actions
de l'enseignant.

Dans "activite_eleves", mettre UNIQUEMENT les actions
des élèves.

Ne jamais mélanger les deux.


============================================================
OBSERVATION
============================================================

Ne génère PAS de champ "observation".

L'observation est gérée dans l'application.


============================================================
OBJECTIFS
============================================================

Les objectifs fournis par l'application doivent rester
fidèles aux informations reçues.

Ne mélange jamais :

- contenu officiel ;
- objectif officiel ;
- commentaire pédagogique.


============================================================
FORMAT
============================================================

Retourne uniquement le JSON demandé par le schéma.

Aucun commentaire avant ou après le JSON.

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


    return await appelerOpenAI(
        requete,
        apiKey,
        instructions,
        schema,
        "fiche_pedagogique_cifon"
    );

}


// ============================================================
// FONCTION OPENAI - EXERCICES AVEC CORRECTIONS
// ============================================================

async function genererExercicesAvecOpenAI(
    requete,
    apiKey
) {

    const instructions = `

Tu es un expert en conception d'exercices scolaires
pour CIFON PÉDAGOGIE NIGER.

Ta mission est de produire une série d'exercices
directement utilisable par un enseignant nigérien.


============================================================
PROGRAMME OFFICIEL
============================================================

Respecte strictement :

- la classe ;
- la matière ;
- le thème ;
- le chapitre ;
- le contenu officiel ;
- les objectifs officiels.

Les exercices doivent être directement liés
aux informations fournies.

Ne change jamais les objectifs officiels.

Ne crée pas une notion qui n'est pas nécessaire
pour le chapitre fourni.


============================================================
DIFFICULTÉ
============================================================

Si la difficulté est :

"Facile"

→ exercices accessibles au niveau de la classe.

"Moyen"

→ exercices de difficulté moyenne.

"Difficile"

→ exercices plus exigeants mais toujours adaptés
au niveau de la classe.

"Progressif"

→ commencer par un exercice facile,
puis augmenter progressivement la difficulté.


============================================================
RÈGLES DES EXERCICES
============================================================

1. Respecte exactement le nombre d'exercices demandé.

2. Chaque exercice doit avoir un numéro.

3. Les numéros doivent être consécutifs :
   1, 2, 3, 4, 5...

4. Chaque exercice doit avoir un niveau.

5. Chaque exercice doit avoir un énoncé complet.

6. Ne donne jamais la réponse dans l'énoncé.

7. Ne donne jamais la correction dans l'énoncé.

8. Les exercices doivent permettre de vérifier
   les objectifs fournis.

9. Les exercices doivent être adaptés au niveau
   des élèves.

10. Ne mélange pas inutilement plusieurs chapitres.

11. Utilise un français clair et adapté aux élèves.

12. Pour les fractions, écrire par exemple :
    3/4

13. Pour les puissances, écrire par exemple :
    x²

14. Pour les racines, écrire par exemple :
    √25

15. Ne produis pas de Markdown.

16. Ne produis pas de code LaTeX.


============================================================
RÈGLES OBLIGATOIRES DES CORRECTIONS
============================================================

Chaque exercice DOIT posséder sa propre correction.

La correction doit correspondre exactement
à l'exercice portant le même numéro.

La correction doit :

- reprendre les données utiles de l'exercice ;
- expliquer la démarche étape par étape ;
- montrer les calculs lorsque cela est nécessaire ;
- donner le résultat final ;
- utiliser un langage adapté au niveau de la classe ;
- permettre à l'enseignant de corriger l'élève.

Pour un exercice de mathématiques,
ne donne pas seulement le résultat final.

Exemple :

Exercice :
Calculer 3 + 5 × 2.

Correction :
On effectue d'abord la multiplication :
5 × 2 = 10.
Puis on effectue l'addition :
3 + 10 = 13.
Donc 3 + 5 × 2 = 13.

La correction ne doit jamais être vide.


============================================================
IMPORTANT
============================================================

Le champ "correction" doit être présent
dans CHAQUE objet de la liste "exercices".

Il doit toujours contenir une chaîne de caractères
non vide.

La correction doit être cohérente avec l'énoncé
et ne doit jamais correspondre à un autre exercice.


============================================================
FORMAT
============================================================

Retourne uniquement le JSON correspondant au schéma.

Aucun commentaire avant ou après le JSON.

Format attendu :

{
    "titre": "Titre de la série",
    "consigne": "Consigne générale",
    "exercices": [
        {
            "numero": 1,
            "niveau": "Facile",
            "enonce": "Énoncé de l'exercice",
            "correction": "Correction détaillée de l'exercice"
        }
    ]
}

`;


    const schema = {

        type: "object",

        additionalProperties: false,

        properties: {

            titre: {

                type: "string"

            },

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

                        niveau: {
                            type: "string"
                        },

                        enonce: {
                            type: "string"
                        },

                        correction: {
                            type: "string"
                        }

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

        required: [
            "titre",
            "consigne",
            "exercices"
        ]

    };


    return await appelerOpenAI(
        requete,
        apiKey,
        instructions,
        schema,
        "serie_exercices_cifon"
    );

}


// ============================================================
// FONCTION COMMUNE D'APPEL OPENAI
// ============================================================

async function appelerOpenAI(
    requete,
    apiKey,
    instructions,
    schema,
    nomSchema
) {

    const corps = {

        model: "gpt-6-luna",

        instructions: instructions,

        input:
            "Voici les informations fournies par CIFON PÉDAGOGIE NIGER :\n\n"
            + requete
            + "\n\n"
            + "Produis maintenant le résultat demandé en respectant strictement les règles.",

        text: {

            format: {

                type: "json_schema",

                name: nomSchema,

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

            body:
                JSON.stringify(corps)

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

    let texteResultat = "";


    if (
        typeof donnees.output_text === "string" &&
        donnees.output_text.trim() !== ""
    ) {

        texteResultat =
            donnees.output_text.trim();

    }


    if (
        !texteResultat &&
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

                    texteResultat +=
                        contenu.text;

                }

            }

        }

    }


    if (!texteResultat) {

        console.error(
            "Réponse OpenAI complète :",
            JSON.stringify(
                donnees,
                null,
                2
            )
        );


        throw new Error(
            "OpenAI a répondu mais aucun contenu structuré n'a été reçu."
        );

    }


    // ========================================================
    // PARSE JSON
    // ========================================================

    let resultat;

    try {

        resultat =
            JSON.parse(
                texteResultat
            );

    } catch (e) {

        console.error(
            "Résultat reçu non JSON :",
            texteResultat
        );


        throw new Error(
            "Le résultat généré n'a pas le format JSON attendu."
        );

    }


    return resultat;

}


// ============================================================
// VALIDATION DU COURS
// ============================================================

function validerCours(
    cours
) {

    if (
        !cours ||
        typeof cours !== "object"
    ) {

        throw new Error(
            "Le cours généré est invalide."
        );

    }


    const champsObligatoires = [

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

    ];


    for (
        const champ
        of champsObligatoires
    ) {

        if (
            cours[champ] === undefined ||
            cours[champ] === null
        ) {

            throw new Error(
                "Le champ obligatoire du cours est absent : "
                + champ
            );

        }

    }


    validerDeroulement(cours);

}


// ============================================================
// VALIDATION DU DÉROULEMENT
// ============================================================

function validerDeroulement(
    cours
) {

    if (
        !cours ||
        !Array.isArray(
            cours.deroulement
        )
    ) {

        throw new Error(
            "Le déroulement pédagogique est absent ou invalide."
        );

    }


    for (
        const ligne
        of cours.deroulement
    ) {

        if (
            !ligne ||
            typeof ligne !== "object"
        ) {

            throw new Error(
                "Une ligne du déroulement est invalide."
            );

        }


        if (
            typeof ligne.etape !== "string"
        ) {

            throw new Error(
                "Le nom de l'étape est invalide."
            );

        }


        if (
            typeof ligne.duree_minutes !== "number"
        ) {

            throw new Error(
                "La durée de l'étape est invalide."
            );

        }


        if (
            typeof ligne.activite_enseignant !== "string"
        ) {

            throw new Error(
                "L'activité de l'enseignant est invalide."
            );

        }


        if (
            typeof ligne.activite_eleves !== "string"
        ) {

            throw new Error(
                "L'activité des élèves est invalide."
            );

        }


        if (
            ligne.activite_enseignant
                .trim() === ""
        ) {

            throw new Error(
                "L'activité de l'enseignant est vide."
            );

        }


        if (
            ligne.activite_eleves
                .trim() === ""
        ) {

            throw new Error(
                "L'activité des élèves est vide."
            );

        }

    }

}


// ============================================================
// VALIDATION DES EXERCICES AVEC CORRECTIONS
// ============================================================

function validerExercices(
    serie
) {

    if (
        !serie ||
        typeof serie !== "object"
    ) {

        throw new Error(
            "La série d'exercices générée est invalide."
        );

    }


    if (
        typeof serie.titre !== "string" ||
        serie.titre.trim() === ""
    ) {

        throw new Error(
            "Le titre de la série d'exercices est absent ou vide."
        );

    }


    if (
        typeof serie.consigne !== "string" ||
        serie.consigne.trim() === ""
    ) {

        throw new Error(
            "La consigne générale des exercices est absente ou vide."
        );

    }


    if (
        !Array.isArray(
            serie.exercices
        )
    ) {

        throw new Error(
            "La liste des exercices est absente ou invalide."
        );

    }


    if (
        serie.exercices.length === 0
    ) {

        throw new Error(
            "Aucun exercice n'a été généré."
        );

    }


    for (
        const exercice
        of serie.exercices
    ) {

        if (
            !exercice ||
            typeof exercice !== "object"
        ) {

            throw new Error(
                "Un exercice généré est invalide."
            );

        }


        if (
            typeof exercice.numero !== "number"
        ) {

            throw new Error(
                "Le numéro d'un exercice est invalide."
            );

        }


        if (
            typeof exercice.niveau !== "string"
        ) {

            throw new Error(
                "Le niveau de l'exercice "
                + exercice.numero
                + " est invalide."
            );

        }


        if (
            exercice.niveau.trim() === ""
        ) {

            throw new Error(
                "Le niveau de l'exercice "
                + exercice.numero
                + " est vide."
            );

        }


        if (
            typeof exercice.enonce !== "string"
        ) {

            throw new Error(
                "L'énoncé de l'exercice "
                + exercice.numero
                + " est invalide."
            );

        }


        if (
            exercice.enonce.trim() === ""
        ) {

            throw new Error(
                "L'énoncé de l'exercice "
                + exercice.numero
                + " est vide."
            );

        }


        // ====================================================
        // CORRECTION OBLIGATOIRE
        // ====================================================

        if (
            typeof exercice.correction !== "string"
        ) {

            throw new Error(
                "La correction de l'exercice "
                + exercice.numero
                + " est absente."
            );

        }


        if (
            exercice.correction.trim() === ""
        ) {

            throw new Error(
                "La correction de l'exercice "
                + exercice.numero
                + " est vide."
            );

        }

    }


    // ========================================================
    // VÉRIFICATION DES NUMÉROS
    // ========================================================

    for (
        let i = 0;
        i < serie.exercices.length;
        i++
    ) {

        const numeroAttendu = i + 1;

        const numeroRecu =
            serie.exercices[i].numero;


        if (
            numeroRecu !== numeroAttendu
        ) {

            throw new Error(
                "Les numéros des exercices doivent être "
                + "consécutifs. Numéro attendu : "
                + numeroAttendu
                + ", numéro reçu : "
                + numeroRecu
                + "."
            );

        }

    }

}


// ============================================================
// GESTION DES ERREURS
// ============================================================

function obtenirMessageErreur(
    erreur
) {

    if (!erreur) {

        return "Erreur inconnue.";

    }


    if (erreur.message) {

        return erreur.message;

    }


    return String(erreur);

}


// ============================================================
// DÉMARRAGE DU SERVEUR
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
            "Routes disponibles :"
        );

        console.log(
            "GET  /"
        );

        console.log(
            "GET  /sante"
        );

        console.log(
            "GET  /test-generation"
        );

        console.log(
            "POST /generer-cours"
        );

        console.log(
            "POST /generer-exercices"
        );

        console.log(
            "================================================"
        );

    }
);
