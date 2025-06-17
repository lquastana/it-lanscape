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
import ldap from 'ldapjs';

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

const openPaths = ['/api/login', '/login.html'];
app.use((req, res, next) => {
  if (openPaths.includes(req.path)) return next();
  if (req.session && req.session.user) return next();
  if (req.method === 'GET') return res.redirect('/login.html');
  return res.status(401).json({ error: 'Not authenticated' });
});

app.use(express.static(path.join(__dirname, 'public')));

/* ---------- /api/login (LDAP) -------------------------- */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  if (!process.env.LDAP_URI || !process.env.NEXT_PUBLIC_LDAP_USER_DN) {
    return res.status(500).json({ error: 'LDAP not configured' });
  }

  const client = ldap.createClient({ url: process.env.LDAP_URI });
  const dn = `chg-aj\\${username}`;

  client.bind(dn, password, (err) => {
    if (err) {
      client.unbind();
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const opts = {
      scope: 'sub',
      filter: `(sAMAccountName=${username})`
    };

    client.search(process.env.NEXT_PUBLIC_LDAP_USER_DN, opts, (searchErr, search) => {
      if (searchErr) {
        client.unbind();
        return res.status(500).json({ error: 'Search error' });
      }
      let sent = false;
      search.on('searchEntry', (entry) => {
        const memberAttr = entry.attributes.find((a) => a.type === 'memberOf');
        const groups = memberAttr ? memberAttr.vals : [];
        const allowed = groups.some((g) =>
          g.includes(process.env.NEXT_PUBLIC_TARGET_GROUP_PHARMACIE) ||
          g.includes(process.env.NEXT_PUBLIC_TARGET_GROUP_DSI)
        );
        if (allowed) {
          sent = true;
          req.session.user = { username, groups };
          res.json({ username, groups });
          client.unbind();
        }
      });
      search.on('error', () => {
        if (!sent) res.status(401).json({ error: 'Authentication failed' });
        client.unbind();
      });
      search.on('end', () => {
        if (!sent) {
          res.status(401).json({ error: 'Authentication failed' });
          client.unbind();
        }
      });
    });
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
