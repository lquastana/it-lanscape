/**
 * Validates all data files against their Zod schemas.
 * Run with: node test/check-schemas.mjs
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveSchema, formatZodErrors } from '../lib/schemas/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

let errors = 0;
let validated = 0;
let skipped = 0;

async function checkFile(filePath) {
  const name = path.basename(filePath, '.json');
  const schema = resolveSchema(name);

  if (!schema) {
    skipped++;
    return;
  }

  const raw = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(raw);
  const result = schema.safeParse(data);

  if (result.success) {
    console.log(`  ✓ ${path.basename(filePath)}`);
    validated++;
  } else {
    console.error(`  ✗ ${path.basename(filePath)}`);
    for (const msg of formatZodErrors(result.error)) {
      console.error(`      ${msg}`);
    }
    errors++;
  }
}

const files = (await fs.readdir(DATA_DIR))
  .filter((f) => f.endsWith('.json'))
  .map((f) => path.join(DATA_DIR, f));

console.log('Validation des schémas JSON\n');

for (const file of files) {
  await checkFile(file);
}

console.log(`\n${validated} fichier(s) valide(s), ${errors} erreur(s), ${skipped} ignoré(s)`);

if (errors > 0) process.exit(1);
