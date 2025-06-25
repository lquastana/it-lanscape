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
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const APP_TITLE = process.env.APP_TITLE || 'Cartographie hospitalière';

const authDisabled = process.env.DISABLE_AUTH === 'true';

let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    defaultHeaders: {
      "OpenAI-Beta": "assistants=v2"
    }
  });
} else {
  console.warn('OPENAI_API_KEY not set, /api/chat disabled');
}
if (!process.env.ASSISTANT_ID) {
  console.warn('ASSISTANT_ID not set, /api/chat disabled');
}

let users = [];
if (!authDisabled) {
  try {
    const data = await fs.readFile(path.join(__dirname, 'data', 'auth', 'users.json'), 'utf-8');
    users = JSON.parse(data);
  } catch {
    console.warn('Aucun fichier users.json, aucun utilisateur chargé');
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
if (!authDisabled) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'change_me',
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  const openPaths = ['/auth/login', '/login.html'];
  app.use((req, res, next) => {
    if (openPaths.includes(req.path)) return next();
    if (req.isAuthenticated()) return next();
    if (req.method === 'GET') return res.redirect('/login.html');
    return res.status(401).json({ error: 'Not authenticated' });
  });
}

app.get('/', async (_req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf-8');
    res.send(html.replace(/{{APP_TITLE}}/g, APP_TITLE));
  } catch {
    res.status(500).send('Index not found');
  }
});
app.get('/index.html', async (_req, res) => {
  try {
    const html = await fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf-8');
    res.send(html.replace(/{{APP_TITLE}}/g, APP_TITLE));
  } catch {
    res.status(500).send('Index not found');
  }
});

app.use(express.static(path.join(__dirname, 'public')));



passport.use(new LocalStrategy(async (username, password, done) => {
  const user = users.find(u => u.username === username);
  if (!user) return done(null, false);
  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user || false);
});

app.post('/auth/login', passport.authenticate('local', {
  failureRedirect: '/login.html?error=1'
}), (req, res) => {
  res.redirect('/');
});

app.get('/auth/logout', (req, res, next) => {
  if (!req.isAuthenticated()) return res.redirect('/login.html');
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login.html');
  });
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
  if (!openai || !process.env.ASSISTANT_ID) {
    return res.status(503).json({ error: 'Assistant not configured' });
  }
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
