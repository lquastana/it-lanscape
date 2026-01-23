import path from 'path';

export function getDataDir() {
  const envDir = process.env.DATA_DIR;
  if (envDir && envDir.trim().length > 0) {
    return path.resolve(envDir);
  }
  return path.join(process.cwd(), 'data');
}

export function resolveDataPath(...segments) {
  return path.join(getDataDir(), ...segments);
}
