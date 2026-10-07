// ============================================================
// CIFON PÉDAGOGIE NIGER
// SERVEUR DE GÉNÉRATION DE COURS
// VERSION 2.1.0
// ============================================================

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const VERSION = "2.1.0";

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
professionnelle, réaliste et directement exploitable
par un enseignant du Niger.


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


============================================================
RÈGLE ESSENTIELLE : SÉPARATION DES ACTIVITÉS
============================================================

Cette règle est OBLIGATOIRE.

Dans chaque élément du tableau "deroulement", il existe
deux colonnes totalement indépendantes :

A. activite_enseignant

B. activite_eleves


============================================================
ACTIVITE ENSEIGNANT
============================================================

Le champ "activite_enseignant" doit contenir UNIQUEMENT
ce que fait l'enseignant.

Il peut notamment contenir :

- présente ;
- explique ;
- pose des questions ;
- donne une consigne ;
- distribue un document ;
- montre un matériel ;
- guide les élèves ;
- observe le travail ;
- circule entre les groupes ;
- corrige ;
- reformule ;
- aide ;
- organise la mise en commun ;
- valide les réponses ;
- institutionnalise la notion ;
- donne un exercice ;
- évalue.


INTERDICTION ABSOLUE :

Ne mets jamais dans "activite_enseignant" une action
réalisée par les élèves.

Ne pas écrire par exemple :

"L'enseignant demande aux élèves d'observer et les élèves
observent..."

Ne pas écrire :

"L'enseignant présente la figure. Les élèves répondent
aux questions."

Dans "activite_enseignant", seule l'action de l'enseignant
doit apparaître.


============================================================
ACTIVITE ELEVES
============================================================

Le champ "activite_eleves" doit contenir UNIQUEMENT
ce que font les élèves.

Il peut notamment contenir :

- observent ;
- écoutent ;
- répondent ;
- lisent ;
- calculent ;
- construisent ;
- manipulent ;
- recherchent ;
- discutent ;
- travaillent individuellement ;
- travaillent en groupe ;
- comparent ;
- justifient ;
- présentent leurs résultats ;
- corrigent ;
- formulent une conclusion ;
- prennent une trace écrite ;
- réalisent les exercices ;
- s'autoévaluent.


INTERDICTION ABSOLUE :

Ne mets jamais dans "activite_eleves" une action réalisée
par l'enseignant.

Ne pas écrire :

"Les élèves observent. L'enseignant explique."

Dans "activite_eleves", seule l'action des élèves
doit apparaître.


============================================================
RÈGLE DE VÉRIFICATION DU DÉROULEMENT
============================================================

Avant de produire la réponse finale, vérifie mentalement
chaque ligne du tableau.

Pour chaque ligne :

1. "activite_enseignant" = uniquement enseignant.

2. "activite_eleves" = uniquement élèves.

3. Il ne doit pas y avoir de mélange entre les deux.

4. Ne répète pas l'activité des élèves dans l'activité
   de l'enseignant.

5. Ne répète pas l'activité de l'enseignant dans l'activité
   des élèves.

6. Les deux colonnes doivent être complémentaires.

7. Les activités doivent correspondre à l'étape indiquée.

8. La durée doit être réaliste.

9. La somme des durées doit correspondre à la durée
   de la séance.


============================================================
FORMAT OBLIGATOIRE DU DÉROULEMENT
============================================================

Chaque élément de "deroulement" doit obligatoirement
respecter cette structure :

{
    "etape": "Nom de l'étape",
    "duree_minutes": 5,
    "activite_enseignant": "Action uniquement réalisée par l'enseignant.",
    "activite_eleves": "Actions uniquement réalisées par les élèves."
}


============================================================
EXEMPLE CORRECT
============================================================

{
    "etape": "Mise en situation",
    "duree_minutes": 5,
    "activite_enseignant": "Présente la situation-problème et pose la question centrale.",
    "activite_eleves": "Observent la situation, identifient le problème et proposent leurs premières réponses."
}


============================================================
AUTRE EXEMPLE CORRECT
============================================================

{
    "etape": "Construction de la notion",
    "duree_minutes": 15,
    "activite_enseignant": "Guide les observations, pose des questions et aide les groupes à organiser leurs résultats.",
    "activite_eleves": "Observent, manipulent, discutent en groupe, réalisent les activités demandées et formulent leurs résultats."
}


============================================================
EXEMPLE INTERDIT
============================================================

INTERDIT :

"activite_enseignant":
"L'enseignant explique la notion et les élèves répondent
aux questions."

Car cette phrase mélange enseignant et élèves.


INTERDIT :

"activite_eleves":
"Les élèves observent pendant que l'enseignant explique."

Car cette phrase mélange élèves et enseignant.


============================================================
AUTRES ACTIVITÉS
============================================================

La même règle de séparation doit être respectée dans
"situation_probleme" et "activite_apprentissage".

Lorsque tu décris une action de l'enseignant, attribue-la
à l'enseignant.

Lorsque tu décris une action des élèves, attribue-la
aux élèves.


============================================================
OBSERVATION
============================================================

Ne génère PAS de champ "observation" dans le JSON.

L'observation sera gérée et modifiée directement par
l'enseignant dans l'application CIFON.


============================================================
RÉFÉRENCES
============================================================

Ne crée pas de référence officielle inexistante.

Si aucune référence précise n'est fournie dans la demande,
ne prétends pas qu'une référence particulière provient
du programme officiel.


============================================================
OBJECTIFS
============================================================

Les objectifs fournis par l'application doivent rester
fidèles aux informations reçues.

Ne mélange jamais :

- contenu officiel ;
- objectif officiel ;
- commentaire pédagogique.

Lorsque les objectifs officiels sont fournis, utilise-les
comme base et ne les remplace pas par des objectifs
inventés.


============================================================
QUALITÉ PÉDAGOGIQUE
============================================================

La fiche doit être adaptée :

- au niveau de la classe ;
- à la matière ;
- au chapitre ;
- aux objectifs ;
- au contexte scolaire nigérien ;
- à la durée disponible.

Les exercices doivent être progressifs.

Les corrections doivent être exploitables par l'enseignant.

L'évaluation doit être cohérente avec les objectifs.


============================================================
FORMAT DE SORTIE
============================================================

Retourne UNIQUEMENT le JSON demandé par le schéma.

Aucun commentaire avant le JSON.

Aucun commentaire après le JSON.

Aucun Markdown.
`;


    // ========================================================
    // SCHÉMA JSON STRICT
    // ========================================================

    const schema = {

        type: "object",

        additionalProperties: false,

        properties: {

            prerequis: {
                type: "string",
                description:
                    "Prérequis nécessaires pour aborder la leçon."
            },


            objectif_general: {
                type: "string",
                description:
                    "Objectif général de la séance."
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


            // ==================================================
            // DÉROULEMENT
            // ==================================================

            deroulement: {

                type: "array",

                description:
                    "Tableau du déroulement. Chaque activité doit être strictement séparée entre enseignant et élèves.",

                items: {

                    type: "object",

                    additionalProperties: false,

                    properties: {

                        etape: {

                            type: "string",

                            description:
                                "Nom de l'étape pédagogique."
                        },


                        duree_minutes: {

                            type: "integer",

                            description:
                                "Durée de cette étape en minutes."
                        },


                        activite_enseignant: {

                            type: "string",

                            description:
                                "UNIQUEMENT les actions réalisées par l'enseignant. Ne jamais inclure une action réalisée par les élèves."

                        },


                        activite_eleves: {

                            type: "string",

                            description:
                                "UNIQUEMENT les actions réalisées par les élèves. Ne jamais inclure une action réalisée par l'enseignant."

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

                type: "string",

                description:
                    "Trace écrite destinée aux élèves."
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


    // ========================================================
    // CORPS DE LA REQUÊTE OPENAI
    // ========================================================

    const corps = {

        model: "gpt-6-luna",

        instructions: instructions,

        input:
            "Voici les informations fournies par l'application :\n\n"
            + requete
            + "\n\n"
            + "Produis maintenant la fiche pédagogique complète en respectant STRICTEMENT toutes les règles précédentes, notamment la séparation entre activite_enseignant et activite_eleves.",

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


    // ========================================================
    // APPEL OPENAI
    // ========================================================

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


    // ========================================================
    // LECTURE DE LA RÉPONSE
    // ========================================================

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


    // ========================================================
    // VALIDATION SUPPLÉMENTAIRE DU DÉROULEMENT
    // ========================================================

    if (
        !coursStructure ||
        !Array.isArray(coursStructure.deroulement)
    ) {

        throw new Error(
            "Le déroulement pédagogique est absent ou invalide."
        );

    }


    for (
        const ligne of coursStructure.deroulement
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
            typeof ligne.etape !== "string" ||
            typeof ligne.activite_enseignant !== "string" ||
            typeof ligne.activite_eleves !== "string"
        ) {

            throw new Error(
                "Chaque ligne du déroulement doit contenir séparément : etape, activite_enseignant et activite_eleves."
            );

        }


        if (
            typeof ligne.duree_minutes !== "number"
        ) {

            throw new Error(
                "La durée d'une étape du déroulement doit être un nombre."
            );

        }


        if (
            ligne.activite_enseignant.trim() === ""
        ) {

            throw new Error(
                "Une activité de l'enseignant est vide."
            );

        }


        if (
            ligne.activite_eleves.trim() === ""
        ) {

            throw new Error(
                "Une activité des élèves est vide."
            );

        }

    }


    console.log(
        "Cours généré avec déroulement structuré."
    );


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
            "================================================"
        );

    }
);
