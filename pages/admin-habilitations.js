import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import AdminNav from '../components/AdminNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'viewer — lecture seule' },
  { value: 'editor', label: 'editor — lecture + écriture' },
  { value: 'admin',  label: 'admin — toutes actions' },
];

const ROLE_BADGE = {
  admin:  'danger',
  editor: 'accent',
  viewer: 'neutral',
};

export default function AdminHabilitations() {
  const [users, setUsers]           = useState([]);
  const [status, setStatus]         = useState('');
  const [saving, setSaving]         = useState(null);
  const [actionMsg, setActionMsg]   = useState({});
  const [pwDrafts, setPwDrafts]     = useState({});
  const statusRef = useRef(null);
  const [newUser, setNewUser]       = useState({ username: '', role: 'viewer', password: '', confirmPassword: '' });

  const handleLogout = async () => { await fetch('/api/auth/logout'); window.location.href = '/login'; };

  const loadUsers = async () => {
    setStatus('Chargement…');
    try {
      const res  = await fetch('/api/admin/roles');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers([...(data.establishments || [])].sort((a, b) => a.username.localeCompare(b.username, 'fr')));
      setStatus('');
    } catch {
      setStatus('❌ Erreur de chargement');
    }
  };

  const announce = msg => {
    setStatus(msg);
    statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => { loadUsers(); }, []);

  const updateRole = async (username, role) => {
    setSaving(username);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role, action: 'update-role' }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur');
      setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u));
      setActionMsg(prev => ({ ...prev, [username]: '✅ Rôle mis à jour' }));
    } catch (err) {
      setActionMsg(prev => ({ ...prev, [username]: err.message }));
      announce('❌ ' + err.message);
    } finally { setSaving(null); }
  };

  const createUser = async e => {
    e.preventDefault();
    const username = newUser.username.trim();
    if (!username) return announce('Nom d\'utilisateur requis.');
    if (!newUser.password || newUser.password.length < 6) return announce('Mot de passe : minimum 6 caractères.');
    if (newUser.password !== newUser.confirmPassword) return announce('Les mots de passe ne correspondent pas.');
    setSaving('create');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', username, role: newUser.role, password: newUser.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur création');
      announce(`✅ Utilisateur ${username} créé.`);
      setNewUser({ username: '', role: 'viewer', password: '', confirmPassword: '' });
      await loadUsers();
    } catch (err) { announce('❌ ' + err.message); }
    finally { setSaving(null); }
  };

  const updatePassword = async username => {
    const password = pwDrafts[username] || '';
    if (password.length < 6) return announce('Mot de passe : minimum 6 caractères.');
    setSaving(`pw-${username}`);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-password', username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setPwDrafts(prev => ({ ...prev, [username]: '' }));
      setActionMsg(prev => ({ ...prev, [username]: '✅ Mot de passe mis à jour' }));
    } catch (err) {
      setActionMsg(prev => ({ ...prev, [username]: '❌ ' + err.message }));
    } finally { setSaving(null); }
  };

  const deleteUser = async username => {
    if (!window.confirm(`Supprimer l'utilisateur ${username} ?`)) return;
    setSaving(`del-${username}`);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');
      setUsers(prev => prev.filter(u => u.username !== username));
      announce(`✅ Utilisateur ${username} supprimé.`);
    } catch (err) { announce('❌ ' + err.message); }
    finally { setSaving(null); }
  };

  const statusClass = status.startsWith('✅') ? 'ok' : status.startsWith('❌') ? 'error' : 'info';

  return (
    <>
      <Head><title>Habilitations — {APP_TITLE}</title></Head>

      <header className="hero business-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME} — Administration</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                Habilitations
              </motion.h1>
              <p className="hero-subtitle">Gestion des comptes et des niveaux d&apos;accès.</p>
            </div>
          </div>
          <AdminNav onLogout={handleLogout} />
        </div>
      </header>

      <main className="page-shell admin-page">

        <div ref={statusRef} aria-live="polite">
          {status && <p className={`admin-status ${statusClass}`}>{status}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

          {/* Créer un utilisateur */}
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="business-section-kicker">Nouveau compte</span>
                <h2>Ajouter un utilisateur</h2>
              </div>
            </div>
            <p className="admin-card-intro">Créez un compte et attribuez-lui un rôle d&apos;accès.</p>

            <form onSubmit={createUser} className="admin-form-stack">
              <label className="admin-label">
                Nom d&apos;utilisateur
                <input className="admin-input" type="text" value={newUser.username}
                  onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                  placeholder="ex : jdupont" autoComplete="off" required />
              </label>
              <label className="admin-label">
                Rôle
                <select className="admin-select" value={newUser.role}
                  onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="admin-label">
                Mot de passe
                <input className="admin-input" type="password" value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required />
              </label>
              <label className="admin-label">
                Confirmer le mot de passe
                <input className="admin-input" type="password" value={newUser.confirmPassword}
                  onChange={e => setNewUser(p => ({ ...p, confirmPassword: e.target.value }))} required />
              </label>
              <button className="admin-btn primary" type="submit" disabled={saving === 'create'} style={{ marginTop: 4 }}>
                {saving === 'create' ? 'Création…' : 'Créer le compte'}
              </button>
            </form>
          </section>

          {/* Liste des utilisateurs */}
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="business-section-kicker">Comptes existants</span>
                <h2>Utilisateurs</h2>
              </div>
              <button className="admin-btn ghost sm" onClick={loadUsers} disabled={!!saving}>
                Rafraîchir
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {users.length === 0 && <p style={{ opacity: 0.5 }}>Aucun utilisateur configuré.</p>}
              {users.map(user => (
                <article key={user.username} className="admin-user-card">
                  <div className="admin-user-header">
                    <div>
                      <h3>{user.username}</h3>
                      <p className="admin-user-meta">
                        ID {user.id || '—'} &nbsp;·&nbsp;
                        <span className={`admin-badge ${ROLE_BADGE[user.role] || 'neutral'}`}>{user.role}</span>
                      </p>
                    </div>
                    <button className="admin-btn danger sm"
                      onClick={() => deleteUser(user.username)}
                      disabled={saving === `del-${user.username}`}
                      aria-label={`Supprimer l'utilisateur ${user.username}`}>
                      {saving === `del-${user.username}` ? '…' : 'Supprimer'}
                    </button>
                  </div>

                  <div className="admin-user-grid">
                    <label className="admin-label">
                      Rôle
                      <select className="admin-select" value={user.role || 'editor'}
                        onChange={e => updateRole(user.username, e.target.value)}
                        disabled={saving === user.username}>
                        {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                    <label className="admin-label">
                      Nouveau mot de passe
                      <input className="admin-input" type="password" placeholder="Min. 6 caractères"
                        value={pwDrafts[user.username] || ''}
                        onChange={e => setPwDrafts(p => ({ ...p, [user.username]: e.target.value }))} />
                    </label>
                  </div>

                  <div className="admin-user-actions">
                    <button className="admin-btn secondary sm"
                      onClick={() => updatePassword(user.username)}
                      disabled={saving === `pw-${user.username}`}>
                      {saving === `pw-${user.username}` ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                    </button>
                    {saving === user.username && <span style={{ fontSize: 13, opacity: 0.6 }}>Enregistrement…</span>}
                    {actionMsg[user.username] && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                        {actionMsg[user.username]}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
