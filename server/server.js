
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// CIFON PÉDAGOGIE NIGER
// SERVEUR DE GÉNÉRATION DE COURS
// ============================================================

// Autoriser les requêtes JSON
app.use(express.json({ limit: "1mb" }));

// Autoriser temporairement les requêtes provenant de l'application
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});


// ============================================================
// PAGE D'ACCUEIL / TEST DU SERVEUR
// ============================================================

app.get("/", (req, res) => {

    res.json({
        nom: "CIFON PÉDAGOGIE NIGER",
        serveur: "Serveur de génération de cours",
        statut: "fonctionnel",
        version: "1.0.0"
    });

});


// ============================================================
// TEST DE SANTÉ DU SERVEUR
// ============================================================

app.get("/sante", (req, res) => {

    res.json({
        success: true,
        message: "Le serveur CIFON fonctionne correctement."
    });

});


// ============================================================
// EXTRACTION DU TEXTE DE LA RESPONSES API
// ============================================================

function extraireTexteReponse(data) {

    if (!data || !Array.isArray(data.output)) {
        return "";
    }

    let texte = "";

    for (const element of data.output) {

        if (!element || !Array.isArray(element.content)) {
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


// ============================================================
// GÉNÉRATION D'UN COURS
// ============================================================

app.post("/generer-cours", async (req, res) => {

    try {

        // --------------------------------------------------------
        // Récupération de la requête envoyée par l'application
        // --------------------------------------------------------

        const requete = req.body?.requete;

        if (
            typeof requete !== "string" ||
            requete.trim().length === 0
        ) {

            return res.status(400).json({
                success: false,
                erreur: "La requête de génération est vide."
            });

        }


        // --------------------------------------------------------
        // La clé API doit être stockée dans les variables
        // d'environnement du serveur.
        //
        // NE JAMAIS mettre la clé API ici.
        // --------------------------------------------------------

        const cleApi = process.env.OPENAI_API_KEY;

        if (!cleApi) {

            return res.status(500).json({
                success: false,
                erreur: "La clé OPENAI_API_KEY n'est pas configurée sur le serveur."
            });

        }


        // --------------------------------------------------------
        // Appel de l'API OpenAI Responses
        // --------------------------------------------------------

        const reponseOpenAI = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + cleApi
                },

                body: JSON.stringify({

                    model: "gpt-5.6-luna",

                    input: [
                        {
                            role: "system",

                            content: [
                                {
                                    type: "input_text",

                                    text:
                                        "Tu es le moteur pédagogique de CIFON PÉDAGOGIE NIGER. " +
                                        "Tu dois préparer une fiche pédagogique complète, précise et directement utilisable par un enseignant. " +
                                        "Tu dois respecter strictement la classe, la matière, le thème, le chapitre, le contenu et les objectifs fournis. " +
                                        "Tu ne dois pas produire un texte générique. " +
                                        "Les activités, exemples, exercices, corrections et évaluations doivent correspondre exactement à la notion demandée. " +
                                        "Tu dois adapter le niveau de difficulté à la classe. " +
                                        "Tu dois répondre en français sauf indication contraire."
                                }
                            ]
                        },

                        {
                            role: "user",

                            content: [
                                {
                                    type: "input_text",

                                    text: requete
                                }
                            ]
                        }
                    ]

                })

            }
        );


        // --------------------------------------------------------
        // Vérification de la réponse OpenAI
        // --------------------------------------------------------

        const donnees = await reponseOpenAI.json();

        if (!reponseOpenAI.ok) {

            console.error(
                "Erreur OpenAI :",
                JSON.stringify(donnees)
            );

            return res.status(500).json({

                success: false,

                erreur:
                    donnees?.error?.message ||
                    "Erreur lors de la génération du cours."

            });

        }


        // --------------------------------------------------------
        // Extraction du cours
        // --------------------------------------------------------

        const cours = extraireTexteReponse(donnees);


        if (!cours) {

            return res.status(500).json({
                success: false,
                erreur: "L'IA n'a retourné aucun contenu."
            });

        }


        // --------------------------------------------------------
        // Réponse envoyée à l'application Android
        // --------------------------------------------------------

        return res.json({

            success: true,

            cours: cours,

            serveur: "CIFON PÉDAGOGIE NIGER",

            version: "1.0.0"

        });


    } catch (erreur) {

        console.error(
            "Erreur serveur :",
            erreur
        );

        return res.status(500).json({

            success: false,

            erreur:
                "Une erreur interne est survenue sur le serveur."

        });

    }

});


// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================

app.listen(PORT, () => {

    console.log(
        "Serveur CIFON PÉDAGOGIE NIGER démarré sur le port " +
        PORT
    );

});
