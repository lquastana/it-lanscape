#!/usr/bin/env node
/**
 * Vérifie les trigrammes et applications en JSON.
 *
 * Usage :
 *    node check-trigrammes.js ./data
 */

import fs from "fs";
import path from "path";

// --- Helpers ---
function normalizeName(str) {
  if (!str) return "";
  return str
    .normalize("NFD") // décompose accents
    .replace(/[\u0300-\u036f]/g, "") // supprime diacritiques
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// --- Entrée ---
const dataPath = process.argv[2];
if (!dataPath) {
  console.error("Usage: node check-trigrammes.js <dossier-data>");
  process.exit(1);
}

// --- Chargement référentiel ---
const triFile = path.join(dataPath, "trigrammes.json");
if (!fs.existsSync(triFile)) {
  console.error(`Fichier introuvable: ${triFile}`);
  process.exit(1);
}
const triJson = JSON.parse(fs.readFileSync(triFile, "utf8"));

const trigramToName = {};
const nameToTrigrams = {};

for (const [tri, label] of Object.entries(triJson)) {
  const norm = normalizeName(label);
  trigramToName[tri.toUpperCase()] = label;
  if (!nameToTrigrams[norm]) nameToTrigrams[norm] = [];
  nameToTrigrams[norm].push(tri.toUpperCase());
}

// --- Doublons ---
console.log("=== Doublons dans trigrammes.json ===");
let dupFound = false;
for (const [name, tris] of Object.entries(nameToTrigrams)) {
  if (tris.length > 1) {
    dupFound = true;
    console.log(`Libellé "${name}" : trigrammes = ${tris.join(", ")}`);
  }
}
if (!dupFound) console.log("Aucun doublon de libellé détecté.");

// --- Vérification des autres fichiers ---
console.log("\n=== Vérification des fichiers d'applications ===");
const files = fs.readdirSync(dataPath).filter(f =>
  f.endsWith(".json") &&
  f !== "trigrammes.json" &&
  !f.includes("infra.json") &&
  !f.includes("network.json")
);

let totalApps = 0;
const issues = [];

for (const file of files) {
  let json;
  try {
    const raw = fs.readFileSync(path.join(dataPath, file), "utf8");
    json = JSON.parse(raw);
  } catch (err) {
    issues.push({ file, type: "ERREUR_JSON", detail: err.message });
    continue;
  }

  for (const etab of json.etablissements || []) {
    for (const dom of etab.domaines || []) {
      for (const proc of dom.processus || []) {
        for (const app of proc.applications || []) {
          totalApps++;
          const appName = app.nom || "";
          const appTri = (app.trigramme || "").toUpperCase();
          const normName = normalizeName(appName);

          const triKnown = appTri && trigramToName[appTri];
          const nameKnown = nameToTrigrams[normName];

          if (!appTri) {
            issues.push({ file, etab: etab.nom, domaine: dom.nom, processus: proc.nom, application: appName,
                          trigramme: "(vide)", type: "ABSENCE_TRIGRAMME", detail: "Application sans trigramme" });
          } else if (!triKnown) {
            issues.push({ file, etab: etab.nom, domaine: dom.nom, processus: proc.nom, application: appName,
                          trigramme: appTri, type: "TRIGRAMME_INCONNU", detail: "Trigramme absent du référentiel" });
          } else if (normalizeName(trigramToName[appTri]) !== normName) {
            issues.push({ file, etab: etab.nom, domaine: dom.nom, processus: proc.nom, application: appName,
                          trigramme: appTri, type: "INCOHERENCE_TRI->NOM", detail: `Référentiel: ${trigramToName[appTri]}` });
          }

          if (nameKnown && !nameToTrigrams[normName].includes(appTri)) {
            issues.push({ file, etab: etab.nom, domaine: dom.nom, processus: proc.nom, application: appName,
                          trigramme: appTri, type: "INCOHERENCE_NOM->TRI", detail: `Référentiel: ${nameToTrigrams[normName].join(", ")}` });
          }
          if (!nameKnown) {
            issues.push({ file, etab: etab.nom, domaine: dom.nom, processus: proc.nom, application: appName,
                          trigramme: appTri, type: "NOM_ABSENT_REFERENTIEL", detail: "Nom d’application absent du référentiel" });
          }
        }
      }
    }
  }
}

console.log(`Applications analysées : ${totalApps}`);

if (issues.length === 0) {
  console.log("✅ Aucune absence ou incohérence détectée.");
} else {
  console.log("\n=== Absences & Incohérences détectées ===");
  for (const i of issues) {
    console.log(`[${i.file}] ${i.type} - ${i.application || ""} (${i.trigramme || ""}) → ${i.detail}`);
  }

  // Export CSV
  const csvPath = path.join(dataPath, "rapport-trigrammes.csv");
  const header = "Fichier;Type;Etablissement;Domaine;Processus;Application;Trigramme;Detail\n";
  const rows = issues.map(i =>
    `${i.file};${i.type};${i.etab || ""};${i.domaine || ""};${i.processus || ""};${i.application || ""};${i.trigramme || ""};${i.detail || ""}`
  );
  fs.writeFileSync(csvPath, header + rows.join("\n"), "utf8");
  console.log(`\n📄 Rapport exporté : ${csvPath}`);
}
