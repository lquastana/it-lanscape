/* --------------------------------------------------------
   BACK-END Express  –  Chat AI (Responses API)
---------------------------------------------------------*/
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { marked } from 'marked';
import { ConfidentialClientApplication } from "@azure/msal-node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "OpenAI-Beta": "assistants=v2"
  }
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false
}));

const openPaths = ['/auth/login','/auth/redirect','/login.html'];
app.use((req, res, next) => {
  if (openPaths.includes(req.path)) return next();
  if (req.session && req.session.user) return next();
  if (req.method === 'GET') return res.redirect('/login.html');
  return res.status(401).json({ error: 'Not authenticated' });
});

app.use(express.static(path.join(__dirname, 'public')));



const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
};
const cca = new ConfidentialClientApplication(msalConfig);

app.get('/auth/login', async (_req, res) => {
  try {
    const url = await cca.getAuthCodeUrl({
      scopes: ['User.Read'],
      redirectUri: process.env.AZURE_REDIRECT_URI
    });
    res.redirect(url);
  } catch {
    res.status(500).send('Failed to generate auth URL');
  }
});

app.get('/auth/redirect', async (req, res) => {
  try {
    const result = await cca.acquireTokenByCode({
      code: req.query.code,
      scopes: ['User.Read'],
      redirectUri: process.env.AZURE_REDIRECT_URI
    });
    const email = result.account.username;
    if (
      process.env.ALLOWED_USER &&
      email.toLowerCase() !== process.env.ALLOWED_USER.toLowerCase()
    ) {
      return res.status(403).send('User not allowed');
    }
    req.session.user = { email };
    res.redirect('/');
  } catch (err) {
    console.error('Auth error', err);
    res.status(500).send('Authentication error');
  }
});

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

app.post('/api/chat', async (req, res) => {
  const question = req.body.question?.trim();
  let threadId = req.body.threadId;

  if (!question) return res.status(400).json({ error: 'Empty question' });

  console.log(`❓ Question reçue: ${question}`);

  try {
    // Crée un thread si aucun ID n'est fourni
    if (!threadId) {
      const newThread = await openai.beta.threads.create();
      threadId = newThread.id;
      console.log(`🧵 Nouveau thread créé: ${threadId}`);
    } else {
      console.log(`🔁 Thread réutilisé: ${threadId}`);
    }

    // Ajout du message utilisateur
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: question
    });
    console.log('📩 Message ajouté');

    // Lancement du run avec enrichissement
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
      additional_instructions: "Rédige une réponse exhaustive, en plusieurs paragraphes et sections détaillées."
    });
    console.log(`🏃‍♂️ Run lancé: ${run.id}`);

    // Attente de la complétion
    let status = run.status;
    while (status !== 'completed' && status !== 'failed') {
      await new Promise((r) => setTimeout(r, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: threadId,
      });
      status = updatedRun.status;
      console.log(`⏳ Statut: ${status}`);
    }

    if (status === 'failed') throw new Error('Run failed');

    // Récupération de la réponse
    const messages = await openai.beta.threads.messages.list(threadId, { limit: 1 });
    const raw = messages.data[0]?.content[0]?.text?.value || 'Pas de réponse.';
    const answer = marked.parse(raw);

    res.json({ answer, threadId });

  } catch (err) {
    console.error('🔥 Erreur assistant:', err);
    res.status(500).json({ error: 'Échec de la requête assistant' });
  }
});
/* ---------- Lancement serveur ---------------------------- */
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
