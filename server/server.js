const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;


/* ============================================================
   CONFIGURATION EXPRESS
   ============================================================ */

app.use(express.json({ limit: "1mb" }));


/* ============================================================
   CORS
   ============================================================ */

app.use((req, res, next) => {

    res.header(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );

    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});


/* ============================================================
   ACCUEIL DU SERVEUR
   ============================================================ */

app.get("/", (req, res) => {

    res.json({

        nom: "CIFON PÉDAGOGIE NIGER",

        serveur:
            "Serveur de génération de cours",

        statut:
            "fonctionnel",

        version:
            "1.0.0"

    });

});


/* ============================================================
   TEST DE SANTÉ
   ============================================================ */

app.get("/sante", (req, res) => {

    res.json({

        success: true,

        message:
            "Le serveur CIFON fonctionne correctement."

    });

});


/* ============================================================
   RÉCUPÉRATION ET NETTOYAGE DE LA CLÉ API
   ============================================================ */

function obtenirCleApi() {

    const cle =
        process.env.OPENAI_API_KEY || "";

    /*
     * Supprime les espaces et retours à la ligne
     * éventuellement présents dans la variable Render.
     */

    return cle.replace(/\s/g, "");

}


/* ============================================================
   EXTRACTION DU TEXTE DE LA RÉPONSE OPENAI
   ============================================================ */

function extraireTexteReponse(data) {

    if (!data) {
        return "";
    }


    /*
     * Méthode 1 :
     * Certaines réponses peuvent contenir output_text.
     */

    if (
        typeof data.output_text === "string" &&
        data.output_text.trim().length > 0
    ) {

        return data.output_text.trim();

    }


    /*
     * Méthode 2 :
     * Lecture de data.output
     */

    if (!Array.isArray(data.output)) {

        return "";

    }


    let texte = "";


    for (const element of data.output) {

        if (
            !element ||
            !Array.isArray(element.content)
        ) {

            continue;

        }


        for (const contenu of element.content) {

            if (
                contenu &&
                contenu.type === "output_text" &&
                typeof contenu.text === "string"
            ) {

                texte += contenu.text;

            }

        }

    }


    return texte.trim();

}


/* ============================================================
   APPEL CENTRAL À OPENAI
   ============================================================ */

async function appelerOpenAI(requete) {

    const cleApi = obtenirCleApi();


    /*
     * Vérification de la clé
     */

    if (!cleApi) {

        throw new Error(
            "OPENAI_API_KEY n'est pas configurée sur Render."
        );

    }


    /*
     * Vérification supplémentaire :
     * une clé API ne doit pas contenir d'espace.
     */

    if (/\s/.test(cleApi)) {

        throw new Error(
            "OPENAI_API_KEY contient encore des caractères invalides."
        );

    }


    /*
     * Appel de l'API Responses
     */

    const reponseOpenAI = await fetch(

        "https://api.openai.com/v1/responses",

        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    "Bearer " + cleApi

            },


            body: JSON.stringify({

                model: "gpt-6-luna",


                input: [

                    {

                        role: "system",

                        content: [

                            {

                                type:
                                    "input_text",

                                text:

                                    "Tu es le moteur pédagogique " +
                                    "de CIFON PÉDAGOGIE NIGER. " +

                                    "Tu dois préparer des cours " +
                                    "et fiches pédagogiques complets, " +
                                    "précis et directement utilisables " +
                                    "par un enseignant. " +

                                    "Tu dois respecter strictement " +
                                    "la classe, la matière, le thème, " +
                                    "le chapitre, le contenu et " +
                                    "les objectifs fournis. " +

                                    "Tu ne dois jamais produire " +
                                    "un cours générique lorsque " +
                                    "des informations précises " +
                                    "sont fournies. " +

                                    "Les activités, exemples, exercices, " +
                                    "corrections et évaluations doivent " +
                                    "correspondre exactement à la notion " +
                                    "demandée. " +

                                    "Tu dois adapter le niveau de difficulté " +
                                    "à la classe. " +

                                    "Tu dois répondre en français " +
                                    "sauf indication contraire."

                            }

                        ]

                    },


                    {

                        role: "user",

                        content: [

                            {

                                type:
                                    "input_text",

                                text:
                                    requete

                            }

                        ]

                    }

                ]

            })

        }

    );


    /*
     * Lecture de la réponse
     */

    const donnees =
        await reponseOpenAI.json();


    /*
     * Gestion des erreurs OpenAI
     */

    if (!reponseOpenAI.ok) {

        console.error(
            "Erreur OpenAI :",
            JSON.stringify(donnees)
        );


        const messageErreur =
            donnees?.error?.message ||
            "Erreur lors de l'appel à OpenAI.";


        throw new Error(
            messageErreur
        );

    }


    /*
     * Extraction du texte
     */

    const texte =
        extraireTexteReponse(donnees);


    if (!texte) {

        throw new Error(
            "OpenAI a répondu mais aucun texte n'a été trouvé."
        );

    }


    return texte;

}


/* ============================================================
   GÉNÉRATION D'UN COURS
   ============================================================ */

app.post("/generer-cours", async (req, res) => {

    try {


        /*
         * Récupération de la requête envoyée
         * par l'application Android.
         */

        const requete =
            req.body?.requete;


        /*
         * Vérification
         */

        if (
            typeof requete !== "string" ||
            requete.trim().length === 0
        ) {

            return res.status(400).json({

                success: false,

                erreur:
                    "La requête de génération est vide."

            });

        }


        /*
         * Appel OpenAI
         */

        const cours =
            await appelerOpenAI(
                requete.trim()
            );


        /*
         * Réponse au téléphone
         */

        return res.json({

            success: true,

            cours: cours,

            serveur:
                "CIFON PÉDAGOGIE NIGER",

            version:
                "1.0.0"

        });


    } catch (erreur) {


        console.error(
            "Erreur /generer-cours :",
            erreur
        );


        return res.status(500).json({

            success: false,

            erreur:
                erreur.message ||
                "Une erreur interne est survenue."

        });

    }

});


/* ============================================================
   TEST SIMPLE DE GÉNÉRATION
   ============================================================ */

app.get("/test-generation", async (req, res) => {

    try {


        /*
         * Vérification de la clé avant l'appel.
         */

        const apiKey =
            obtenirCleApi();


        if (!apiKey) {

            return res.status(500).json({

                success: false,

                erreur:
                    "OPENAI_API_KEY n'est pas configurée."

            });

        }


        /*
         * Petit test indépendant.
         */

        const reponse =
            await fetch(

                "https://api.openai.com/v1/responses",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + apiKey

                    },


                    body: JSON.stringify({

                        model:
                            "gpt-6-luna",


                        input: [

                            {

                                role:
                                    "system",

                                content: [

                                    {

                                        type:
                                            "input_text",

                                        text:
                                            "Tu es le moteur pédagogique " +
                                            "de CIFON PÉDAGOGIE NIGER."

                                    }

                                ]

                            },


                            {

                                role:
                                    "user",

                                content: [

                                    {

                                        type:
                                            "input_text",

                                        text:
                                            "Prépare un très court exemple " +
                                            "de cours de mathématiques pour " +
                                            "une classe de 6e sur le cube " +
                                            "et le pavé droit."

                                    }

                                ]

                            }

                        ]

                    })

                }

            );


        /*
         * Lecture de la réponse OpenAI
         */

        const data =
            await reponse.json();


        /*
         * Si OpenAI retourne une erreur
         */

        if (!reponse.ok) {

            console.error(
                "Erreur test OpenAI :",
                JSON.stringify(data)
            );


            return res.status(
                reponse.status
            ).json({

                success: false,

                erreur: data

            });

        }


        /*
         * Extraction du texte
         */

        const texte =
            extraireTexteReponse(
                data
            );


        /*
         * Vérification
         */

        if (!texte) {

            return res.status(500).json({

                success: false,

                erreur:
                    "OpenAI a répondu mais aucun texte n'a été retourné."

            });

        }


        /*
         * Test réussi
         */

        return res.json({

            success: true,

            message:
                "La connexion CIFON → Render → OpenAI fonctionne.",

            cours:
                texte,

            serveur:
                "CIFON PÉDAGOGIE NIGER",

            version:
                "1.0.0"

        });


    } catch (erreur) {


        console.error(
            "Erreur test-generation :",
            erreur
        );


        return res.status(500).json({

            success: false,

            erreur:
                erreur.message ||
                "Erreur interne du serveur."

        });

    }

});


/* ============================================================
   DÉMARRAGE DU SERVEUR
   ============================================================ */

app.listen(
    PORT,
    () => {

        console.log(
            "Serveur CIFON PÉDAGOGIE NIGER " +
            "démarré sur le port " +
            PORT
        );

    }
);
