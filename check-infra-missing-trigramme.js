#!/usr/bin/env node
/**
 * Liste les serveurs sans trigramme dans tous les fichiers *infra.json d'un dossier.
 *
 * Usage:
 *    node check-infra-missing-trigramme.js ./data
 *
 * Produit:
 *    - Affichage console
 *    - ./data/serveurs-sans-trigramme.csv
 *    - ./data/serveurs-sans-trigramme.json (copie JSON des résultats)
 */

import fs from "fs";
import path from "path";

// --------- Utils ---------
function isMissingTrigram(value) {
  if (value === undefined || value === null) return true;
  const s = String(value).trim().toUpperCase();
  return s.length === 0 || s === "XXX";
}

function normalize(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Essayez d'inférer vaguement l'appli depuis le nom de VM / rôle (best effort)
function guessAppName(vm, role, editeur, candidates = []) {
  const hay = `${vm || ""} ${role || ""} ${editeur || ""}`.toUpperCase();
  // Si on a un référentiel des applis (candidates), tentez un match sur un mot-clé
  for (const label of candidates) {
    const token = label.toUpperCase();
    if (token.length >= 3 && hay.includes(token)) return label;
  }
  // Heuristiques très simples sur quelques patterns fréquents
  if (/DXCARE|DXC\b|DPI/i.test(hay)) return "DxCare";
  if (/PHILIPS|INTELLIVUE|ISP\b/i.test(hay)) return "Philips IntelliVue";
  if (/PRTG/i.test(hay)) return "PRTG";
  if (/CLOVERLEAF/i.test(hay)) return "Cloverleaf";
  if (/ENOVACOM/i.test(hay)) return "Enovacom";
  if (/SENTINEL/i.test(hay)) return "SentinelOne";
  if (/FORTI|FORTINET/i.test(hay)) return "Fortinet";
  if (/GLPI/i.test(hay)) return "GLPI";
  return "";
}

function toCsvRow(fields) {
  // simple CSV ; séparateur ; ; échappe les guillemets
  return fields
    .map((v) => (v === undefined || v === null ? "" : String(v).replace(/"/g, '""')))
    .map((v) => `"${v}"`)
    .join(";");
}

// --------- Entrée ---------
const dataPath = process.argv[2];
if (!dataPath) {
  console.error("Usage: node check-infra-missing-trigramme.js <dossier-data>");
  process.exit(1);
}

// Charger éventuellement les noms d'applis depuis trigrammes.json (pour aider à deviner)
let referentialLabels = [];
const triPath = path.join(dataPath, "trigrammes.json");
if (fs.existsSync(triPath)) {
  try {
    const tri = JSON.parse(fs.readFileSync(triPath, "utf8"));
    referentialLabels = Object.values(tri)
      .filter(Boolean)
      .map((s) => normalize(String(s)));
  } catch {
    // pas bloquant
  }
}

// --------- Parcours des *infra.json ---------
const files = fs
  .readdirSync(dataPath)
  .filter((f) => f.endsWith("infra.json"));

if (files.length === 0) {
  console.log("Aucun fichier *infra.json trouvé dans", dataPath);
  process.exit(0);
}

const results = [];

for (const file of files) {
  const full = path.join(dataPath, file);
  let json;
  try {
    const raw = fs.readFileSync(full, "utf8");
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`ERREUR_JSON dans ${file} → ${err.message}`);
    continue;
  }

  const etab = json.etablissement || json.etablissements || "";
  const serveurs = Array.isArray(json.serveurs) ? json.serveurs : [];

  for (const s of serveurs) {
    const tri = s.trigramme;
    if (isMissingTrigram(tri)) {
      const vm = s.VM || s.Nom || s.Hostname || "";
      const ip = s.PrimaryIPAddress || s.IP || s.Ip || "";
      const role = s.RoleServeur || s.Role || s.Description || "";
      const os = s.OS || s.Os || "";
      const editeur = s.Editeur || s.Vendor || "";

      const guess = guessAppName(vm, role, editeur, referentialLabels);

      results.push({
        fichier: file,
        etablissement: etab,
        vm,
        ip,
        os,
        editeur,
        role: role,
        trigramme: tri ?? "",
        application_suspectee: guess,
      });
    }
  }
}

// --------- Sorties ---------
if (results.length === 0) {
  console.log("✅ Aucun serveur sans trigramme trouvé dans les *infra.json.");
  process.exit(0);
}

console.log("=== Serveurs sans trigramme détectés ===");
for (const r of results) {
  console.log(
    `[${r.fichier}] ${r.vm} (${r.ip}) — OS: ${r.os} — Éditeur: ${r.editeur} — Rôle: ${r.role}` +
      (r.application_suspectee ? ` — Appli suspectée: ${r.application_suspectee}` : "")
  );
}

// Export CSV
const csvPath = path.join(dataPath, "serveurs-sans-trigramme.csv");
const header = [
  "Fichier",
  "Etablissement",
  "VM",
  "IP",
  "OS",
  "Editeur",
  "Role",
  "Trigramme",
  "ApplicationSuspectee",
];
const rows = results.map((r) =>
  toCsvRow([
    r.fichier,
    r.etablissement,
    r.vm,
    r.ip,
    r.os,
    r.editeur,
    r.role,
    r.trigramme,
    r.application_suspectee,
  ])
);
fs.writeFileSync(csvPath, toCsvRow(header) + "\n" + rows.join("\n"), "utf8");

// Export JSON (optionnel, utile pour tooling)
const jsonPath = path.join(dataPath, "serveurs-sans-trigramme.json");
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");

console.log(`\n📄 Exports :
- CSV  : ${csvPath}
- JSON : ${jsonPath}`);
