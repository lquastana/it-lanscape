import fs from 'fs/promises';
import { resolveDataPath } from './dataPaths.js';

const ROLE_ORDER = ['viewer', 'editor', 'admin'];

let cached = null;

export async function loadEntraGroupMap() {
  if (cached) return cached;
  try {
    const filePath = resolveDataPath('auth', 'entra-group-map.json');
    const content = await fs.readFile(filePath, 'utf-8');
    cached = JSON.parse(content);
  } catch {
    cached = { groups: {}, defaultRole: 'viewer' };
  }
  return cached;
}

export function resolveRoleFromGroups(groups, groupMap) {
  const { groups: mapping = {}, defaultRole = 'viewer' } = groupMap;
  let highestIndex = ROLE_ORDER.indexOf(defaultRole);
  if (highestIndex < 0) highestIndex = 0;

  for (const groupId of groups) {
    const role = mapping[groupId];
    const idx = ROLE_ORDER.indexOf(role);
    if (idx > highestIndex) highestIndex = idx;
  }

  return ROLE_ORDER[highestIndex];
}
