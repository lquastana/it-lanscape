import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',            label: 'Vue Métier' },
  { href: '/applications', label: 'Vue Applicative' },
  { href: '/flux',         label: 'Vue Flux' },
  { href: '/network',      label: 'Vue Réseau' },
  { href: '/incident',     label: "Simulation d'incident" },
];

const ADMIN_URL = 'https://animated-disco-rr6xww57pjfwxvv-3000.app.github.dev/admin-metier';

export default function MainNav({ onLogout }) {
  const router = useRouter();
  const [canAdmin, setCanAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          const role = data?.user?.role;
          setCanAdmin(role === 'admin' || role === 'editor');
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const currentPath = router.pathname;

  return (
    <nav className="view-switch" aria-label="Navigation des vues">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={currentPath === href ? 'active' : undefined}
          aria-current={currentPath === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
      {canAdmin && (
        <a
          href={ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-settings"
          title="Administration"
          aria-label="Ouvrir l'administration"
        >
          <Settings size={17} strokeWidth={2.4} aria-hidden="true" />
        </a>
      )}
      <button className="nav-logout" onClick={onLogout}>
        Déconnexion
      </button>
    </nav>
  );
}
