#!/usr/bin/env node
/**
 * Initialises .env.local for local development if it doesn't exist yet.
 * Generates a cryptographically random NEXTAUTH_SECRET so the developer
 * never has to touch a config file before running `npm run dev`.
 *
 * Codespace support: when CODESPACE_NAME is set the script rewrites
 * NEXTAUTH_URL to match the forwarded port URL automatically.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL = path.join(ROOT, '.env.local');
const ENV_EXAMPLE = path.join(ROOT, '.env.local.example');

if (fs.existsSync(ENV_LOCAL)) process.exit(0);

let content = fs.readFileSync(ENV_EXAMPLE, 'utf-8');

// Replace the placeholder secret with a real random one.
const secret = crypto.randomBytes(32).toString('hex');
content = content.replace(/^NEXTAUTH_SECRET=.*/m, `NEXTAUTH_SECRET=${secret}`);

// In GitHub Codespaces, rewrite NEXTAUTH_URL to the forwarded URL.
const codespaceName = process.env.CODESPACE_NAME;
const codespaceDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
if (codespaceName) {
  const codespaceUrl = `https://${codespaceName}-3000.${codespaceDomain}`;
  content = content.replace(/^NEXTAUTH_URL=.*/m, `NEXTAUTH_URL=${codespaceUrl}`);
  console.log(`[dev-init] Codespace détecté → NEXTAUTH_URL=${codespaceUrl}`);
}

fs.writeFileSync(ENV_LOCAL, content, 'utf-8');
console.log('[dev-init] .env.local créé automatiquement (secret généré aléatoirement).');
console.log('[dev-init] Vous pouvez l\'éditer librement — il ne sera jamais commité.');
