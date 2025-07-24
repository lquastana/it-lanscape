import OpenAI from 'openai';
import { marked } from 'marked';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const question = req.body.question?.trim();
  let threadId = req.body.threadId;
  if (!question) return res.status(400).json({ error: 'Empty question' });

  try {
    if (!threadId) {
      const t = await openai.beta.threads.create();
      threadId = t.id;
    }

    await openai.beta.threads.messages.create(threadId, { role: 'user', content: question });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
      additional_instructions: 'Rédige une réponse exhaustive, en plusieurs paragraphes et sections détaillées.'
    });

    let status = run.status;
    while (status !== 'completed' && status !== 'failed') {
      await new Promise(r => setTimeout(r, 1000));
      const updated = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
      status = updated.status;
    }
    if (status === 'failed') throw new Error('Run failed');

    const msgs = await openai.beta.threads.messages.list(threadId, { limit: 1 });
    const raw = msgs.data[0]?.content[0]?.text?.value || 'Pas de réponse.';
    const answer = marked.parse(raw);
    res.status(200).json({ answer, threadId });
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'Échec de la requête assistant' });
  }
}
