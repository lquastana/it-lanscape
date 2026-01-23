import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'viewer (lecture seule)' },
  { value: 'editor', label: 'editor (lecture + écriture)' },
  { value: 'admin', label: 'admin (toutes actions)' },
];

export default function AdminHabilitations() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(null);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  const loadUsers = async () => {
    setStatus('Chargement…');
    try {
      const res = await fetch('/api/admin/roles');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.establishments || []);
      setStatus('');
    } catch {
      setStatus('Erreur de chargement des habilitations');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (username, role) => {
    setSaving(username);
    setStatus('');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur mise à jour rôle');
      }
      setUsers(prev =>
        prev.map(user => (user.username === username ? { ...user, role } : user))
      );
      setStatus(`✅ Rôle mis à jour pour ${username}`);
    } catch (error) {
      setStatus(error.message || 'Erreur mise à jour rôle');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Head><title>Administration habilitations</title></Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <h1>Administration des habilitations</h1>
              <p className="hero-subtitle">Gestion des rôles d'accès pour les comptes autorisés.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/admin-metier">Gestion vue métier</Link>
            <Link href="/admin-infra">Gestion vue infrastructure</Link>
            <Link href="/admin-flux">Gestion flux</Link>
            <Link href="/admin-trigramme">Référentiel trigrammes</Link>
            <Link className="active" href="/admin-habilitations">Habilitations</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>

      <section className="page-shell" style={{ padding: '1.5rem 0' }}>
        <p className="status">{status}</p>
        <div className="grid" style={{ gap: '1rem' }}>
          {users.map(user => (
            <article key={user.username} style={{ padding: '1rem' }}>
              <h3 style={{ marginBottom: '0.25rem' }}>{user.username}</h3>
              <p style={{ marginTop: 0, opacity: 0.7 }}>ID: {user.id || '—'}</p>
              <label htmlFor={`role-${user.username}`}>Rôle</label>
              <select
                id={`role-${user.username}`}
                value={user.role || 'editor'}
                onChange={e => updateRole(user.username, e.target.value)}
                disabled={saving === user.username}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {saving === user.username && <p>Enregistrement…</p>}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
