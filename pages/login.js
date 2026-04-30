import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';

function normalizeRedirect(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'string') return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.startsWith('/login')) return '/';
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [redirectedFrom, setRedirectedFrom] = useState('/');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    setRedirectedFrom(normalizeRedirect(router.query.redirectedFrom));
  }, [router.isReady, router.query.redirectedFrom]);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.user?.isLoggedIn) {
          router.replace(normalizeRedirect(router.query.redirectedFrom));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username: event.currentTarget.username.value,
      password: event.currentTarget.password.value,
      redirect: false,
      callbackUrl: redirectedFrom,
    });

    if (result?.ok) {
      router.replace(redirectedFrom);
    } else {
      setError('Échec de la connexion. Veuillez vérifier vos identifiants.');
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Connexion — {APP_TITLE}</title>
        <meta charSet="UTF-8" />
      </Head>

      <header className="hero business-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME}</p>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {APP_TITLE}
              </motion.h1>
              <p className="hero-subtitle">
                Connectez-vous pour accéder à la cartographie du système d&apos;information.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="login-shell page-shell">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="login-card-header">
            <span className="business-section-kicker">Accès sécurisé</span>
            <h2>Se connecter</h2>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="username">Nom d&apos;utilisateur</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="login-error" role="alert">{error}</p>
            )}

            <p className="login-info">
              Le mot de passe se trouve dans votre coffre-fort sous la clé <strong>CARTOGRAPHIE-SI</strong>.
            </p>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </motion.div>
      </main>
    </>
  );
}
