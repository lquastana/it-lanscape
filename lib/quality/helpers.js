import { CIDR_RE } from './constants.js';

export function blank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

export function normalizeTrig(value) {
  return String(value || '').trim().toUpperCase();
}

export function roundScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isExternalHosting(value) {
  return /saas|cloud|externe|external/i.test(String(value || ''));
}

export function hasInterface(application) {
  return Object.values(application.interfaces || {}).some(Boolean);
}

export function labelForApplication(app) {
  return `${app.nom || app.trigramme || 'Application'} (${app.etablissement || 'site inconnu'})`;
}

export function cidrListIsValid(value) {
  if (blank(value)) return true;
  return String(value).split(',').map(item => item.trim()).filter(Boolean).every(cidr => CIDR_RE.test(cidr));
}
