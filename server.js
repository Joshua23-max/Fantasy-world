import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://your-project.vercel.app",
    "X-Title": "Reborn Kingdom",
  },
});

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const characters = {
  elara: {
    name: "Princess Elara",
    personality: "Kind, curious, brave and intelligent. She is protective of the player and fascinated by their mysterious origins."
  },
  knight: {
    name: "Sir Kael",
    personality: "Serious, loyal and cautious. He distrusts strangers but respects courage and honesty."
  },
  mage: {
    name: "Liora",
    personality: "A clever young mage who loves discovering ancient magic. She is playful but extremely knowledgeable."
  },
  goblin: {
    name: "Grim",
    personality: "A mischievous goblin who talks quickly, loves shiny objects and sometimes accidentally reveals useful information."
  }
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, character = "elara", history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Please enter a message." });
    }

    const selected = characters[character] || characters.elara;

    const systemPrompt = `
You are the AI narrator and game master of an interactive fantasy adventure.

WORLD:
The player has been mysteriously reborn into a medieval fantasy world called Eldoria.

STORY:
The player recently woke up in a mysterious forest and was saved by Princess Elara from goblins.
She believes the player may be connected to an ancient mystery.

CURRENT CHARACTER: ${selected.name}
PERSONALITY: ${selected.personality}

RULES:
- Never decide the player's actions.
- Never write dialogue for the player.
- Keep responses immersive and not too long.
- Stay in character.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-20).map(item => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content
      })),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      messages,
      temperature: 0.85,
      max_tokens: 700
    });

    const reply = completion.choices[0]?.message?.content || "The world falls silent...";

    res.json({
      reply,
      character: selected.name
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "The kingdom's magic failed to respond." });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}

export default app;
