import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import AdminNav from '../components/AdminNav';
import { LOGO_URL, ORG_NAME } from '../lib/branding';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'viewer (lecture seule)' },
  { value: 'editor', label: 'editor (lecture + écriture)' },
  { value: 'admin', label: 'admin (toutes actions)' },
];

export default function AdminHabilitations() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(null);
  const [actionMessages, setActionMessages] = useState({});
  const statusRef = useRef(null);
  const [newUser, setNewUser] = useState({
    username: '',
    role: 'viewer',
    password: '',
    confirmPassword: '',
  });
  const [passwordDrafts, setPasswordDrafts] = useState({});

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
      const list = (data.establishments || []).slice();
      list.sort((a, b) => a.username.localeCompare(b.username, 'fr'));
      setUsers(list);
      setStatus('');
    } catch {
      setStatus('Erreur de chargement des habilitations');
    }
  };

  const announceStatus = message => {
    setStatus(message);
    if (statusRef.current) {
      statusRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const setActionMessage = (key, message) => {
    setActionMessages(prev => ({ ...prev, [key]: message }));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (username, role) => {
    setSaving(username);
    setStatus('');
    setActionMessage(username, '');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role, action: 'update-role' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur mise à jour rôle');
      }
      setUsers(prev =>
        prev.map(user => (user.username === username ? { ...user, role } : user))
      );
      setActionMessage(username, '✅ Rôle mis à jour.');
      announceStatus(`✅ Rôle mis à jour pour ${username}`);
    } catch (error) {
      setActionMessage(username, error.message || 'Erreur mise à jour rôle');
      announceStatus(error.message || 'Erreur mise à jour rôle');
    } finally {
      setSaving(null);
    }
  };

  const createUser = async event => {
    event.preventDefault();
    const username = newUser.username.trim();
    if (!username) {
      announceStatus('Nom d’utilisateur requis.');
      return;
    }
    if (!newUser.password || newUser.password.length < 6) {
      announceStatus('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      announceStatus('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving('create');
    setStatus('');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          username,
          role: newUser.role,
          password: newUser.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erreur création utilisateur');
      }
      announceStatus(`✅ Utilisateur ${username} créé.`);
      setNewUser({ username: '', role: 'viewer', password: '', confirmPassword: '' });
      await loadUsers();
    } catch (error) {
      announceStatus(error.message || 'Erreur création utilisateur');
    } finally {
      setSaving(null);
    }
  };

  const updatePassword = async username => {
    const password = passwordDrafts[username] || '';
    if (!password || password.length < 6) {
      announceStatus('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setSaving(`password-${username}`);
    setStatus('');
    setActionMessage(username, '');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-password', username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erreur mise à jour mot de passe');
      }
      setPasswordDrafts(prev => ({ ...prev, [username]: '' }));
      setActionMessage(username, '✅ Mot de passe mis à jour.');
      announceStatus(`✅ Mot de passe mis à jour pour ${username}.`);
    } catch (error) {
      setActionMessage(username, error.message || 'Erreur mise à jour mot de passe');
      announceStatus(error.message || 'Erreur mise à jour mot de passe');
    } finally {
      setSaving(null);
    }
  };

  const deleteUser = async username => {
    if (!window.confirm(`Supprimer l'utilisateur ${username} ?`)) return;
    setSaving(`delete-${username}`);
    setStatus('');
    setActionMessage(username, '');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erreur suppression utilisateur');
      }
      setUsers(prev => prev.filter(user => user.username !== username));
      announceStatus(`✅ Utilisateur ${username} supprimé.`);
    } catch (error) {
      setActionMessage(username, error.message || 'Erreur suppression utilisateur');
      announceStatus(error.message || 'Erreur suppression utilisateur');
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
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME}</p>
              <h1>Administration des habilitations</h1>
              <p className="hero-subtitle">Gestion des rôles d'accès pour les comptes autorisés.</p>
            </div>
          </div>
          <AdminNav onLogout={handleLogout} />
        </div>
      </header>

      <section className="page-shell" style={{ padding: '1.5rem 0' }}>
        <div ref={statusRef} aria-live="polite" className="status-banner">
          {status && <p className="status">{status}</p>}
        </div>

        <div className="grid columns">
          <section className="card">
            <h2>Ajouter un utilisateur</h2>
            <p className="muted">Créez un compte Basic Auth et attribuez-lui un rôle.</p>
            <form onSubmit={createUser} className="form-stack">
              <label>
                Nom d’utilisateur
                <input
                  type="text"
                  value={newUser.username}
                  onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="ex: jdupont"
                  required
                />
              </label>
              <label>
                Rôle
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Mot de passe
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </label>
              <label>
                Confirmer le mot de passe
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={e => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </label>
              <button type="submit" className="primary" disabled={saving === 'create'} aria-busy={saving === 'create'}>
                {saving === 'create' ? 'Création…' : 'Créer le compte'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>Utilisateurs existants</h2>
                <p className="muted">Mettez à jour les rôles, mots de passe ou supprimez un compte.</p>
              </div>
              <button type="button" className="ghost" onClick={loadUsers} disabled={saving === 'refresh'}>
                Rafraîchir
              </button>
            </div>
            <div className="user-list">
              {users.map(user => (
                <article key={user.username} className="user-card">
                  <div className="user-header">
                    <div>
                      <h3>{user.username}</h3>
                      <p className="muted">ID: {user.id || '—'}</p>
                    </div>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteUser(user.username)}
                      disabled={saving === `delete-${user.username}`}
                      aria-busy={saving === `delete-${user.username}`}
                    >
                      {saving === `delete-${user.username}` ? 'Suppression…' : 'Supprimer'}
                    </button>
                  </div>

                  <div className="user-grid">
                    <label>
                      Rôle
                      <select
                        value={user.role || 'editor'}
                        onChange={e => updateRole(user.username, e.target.value)}
                        disabled={saving === user.username}
                        aria-busy={saving === user.username}
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Nouveau mot de passe
                      <input
                        type="password"
                        value={passwordDrafts[user.username] || ''}
                        onChange={e =>
                          setPasswordDrafts(prev => ({ ...prev, [user.username]: e.target.value }))
                        }
                        placeholder="Min 6 caractères"
                      />
                    </label>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => updatePassword(user.username)}
                      disabled={saving === `password-${user.username}`}
                      aria-busy={saving === `password-${user.username}`}
                    >
                      {saving === `password-${user.username}` ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                    </button>
                    {saving === user.username && <span className="muted">Enregistrement du rôle…</span>}
                    {actionMessages[user.username] && (
                      <span className="action-message">{actionMessages[user.username]}</span>
                    )}
                  </div>
                </article>
              ))}
              {users.length === 0 && <p className="muted">Aucun utilisateur configuré.</p>}
            </div>
          </section>
        </div>
      </section>

      <style jsx>{`
        .status {
          margin-bottom: 1rem;
          font-weight: 600;
          color: var(--color-primary, #003366);
          padding: 0.75rem 1rem;
          background: #f0f6ff;
          border: 1px solid #cfe0ff;
          border-radius: 12px;
        }
        .status-banner:empty {
          display: none;
        }
        label {
          font-weight: 600;
          color: var(--color-primary, #003366);
        }
        .columns {
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .card {
          background: #ffffff;
          border: 1px solid #d6e2f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 51, 102, 0.06);
        }
        .form-stack {
          display: grid;
          gap: 12px;
        }
        .form-stack input,
        .form-stack select,
        .user-card input,
        .user-card select {
          margin-top: 6px;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cfd8e3;
          border-radius: 12px;
          background: #ffffff;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .form-stack input:focus,
        .form-stack select:focus,
        .user-card input:focus,
        .user-card select:focus {
          border-color: #1d74e7;
          box-shadow: 0 0 0 3px rgba(29, 116, 231, 0.15);
          outline: none;
        }
        .primary {
          background: linear-gradient(135deg, #1d74e7, #0f5bd6);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(29, 116, 231, 0.2);
        }
        .primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .ghost {
          border: 1px solid #c8d6e5;
          background: #f5f8ff;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          color: #1b4d9b;
        }
        .user-list {
          display: grid;
          gap: 16px;
        }
        .user-card {
          border: 1px solid #e4ebf4;
          border-radius: 14px;
          padding: 16px;
          background: #f9fbfe;
        }
        .user-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .user-header h3 {
          margin: 0;
        }
        .user-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          margin-top: 12px;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .action-message {
          font-weight: 600;
          color: #0f4bb5;
        }
        .secondary {
          background: #eaf2ff;
          border: 1px solid #bcd3ff;
          color: #0f4bb5;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
        }
        .danger {
          background: #fff1f2;
          border: 1px solid #f2b8bd;
          color: #b4232a;
          border-radius: 10px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 600;
        }
        .muted {
          opacity: 0.7;
          margin: 0.2rem 0 0;
        }
      `}</style>
    </>
  );
}
