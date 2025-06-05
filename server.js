/* --------------------------------------------------------
   BACK-END Express  –  Chat AI (Responses API)
---------------------------------------------------------*/
import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v2"
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ---------- /api/landscape (inchangé) ------------------- */
app.get('/api/landscape', async (_req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');
    const files = (await fs.readdir(dataDir)).filter(f => f.endsWith('.json'));
    const etablissements = [];

    for (const f of files) {
      const { etablissements: e = [] } = JSON.parse(await fs.readFile(path.join(dataDir, f), 'utf-8'));
      etablissements.push(...e);
    }
    res.json({ etablissements });
  } catch {
    res.status(500).json({ error: 'Erreur lecture JSON' });
  }
});

/* ---------- /api/chat (Markdown intégré) ---------------- */
app.post('/api/chat', async (req, res) => {
  const question = req.body.question?.trim();
  if (!question) return res.status(400).json({ error: 'Empty question' });

  console.log(`❓ Question reçue: ${question}`);

  try {
    const thread = await openai.beta.threads.create();
    console.log(`🧵 Thread: ${thread.id}`);

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: question
    });
    console.log('📩 Message ajouté');

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID
    });
    console.log(`🏃‍♂️ Run: ${run.id}`);

    let status = run.status;
    while (status !== 'completed' && status !== 'failed') {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
      status = updatedRun.status;
      console.log(`⏳ Status: ${status}`);
    }

    if (status === 'failed') throw new Error('Run failed');

    const messages = await openai.beta.threads.messages.list(thread.id, { limit: 1 });
    const raw = messages.data[0]?.content[0]?.text?.value || 'Pas de réponse.';
    const answer = marked.parse(raw);

    res.json({ answer });

  } catch (err) {
    console.error('🔥 Erreur assistant:', err);
    res.status(500).json({ error: 'Échec de la requête assistant' });
  }
});

/* ---------- Lancement serveur ---------------------------- */
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
