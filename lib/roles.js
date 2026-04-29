const ROLE_ORDER = ['viewer', 'editor', 'admin'];

export function authorize(action, role) {
  if (!role) return false;
  const roleIndex = ROLE_ORDER.indexOf(role);
  if (roleIndex < 0) return false;
  if (action === 'read') return roleIndex >= ROLE_ORDER.indexOf('viewer');
  if (action === 'write') return roleIndex >= ROLE_ORDER.indexOf('editor');
  if (action === 'admin') return roleIndex >= ROLE_ORDER.indexOf('admin');
  return false;
}
