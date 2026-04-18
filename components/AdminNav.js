import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin-metier', label: 'Gestion vue métier' },
  { href: '/admin-infra', label: 'Gestion vue infrastructure' },
  { href: '/admin-flux', label: 'Gestion flux' },
  { href: '/admin-trigramme', label: 'Référentiel trigrammes' },
];

export default function AdminNav({ onLogout }) {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!cancelled) {
          setRole(data?.user?.role || null);
        }
      } catch {
        if (!cancelled) setRole(null);
      }
    };
    loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPath = router.pathname;

  return (
    <nav className="view-switch" aria-label="Navigation des vues">
      {NAV_ITEMS.map(item => (
        <NavLink key={item.href} href={item.href} currentPath={currentPath}>
          {item.label}
        </NavLink>
      ))}
      {role === 'admin' && (
        <NavLink href="/admin-habilitations" currentPath={currentPath}>
          Habilitations
        </NavLink>
      )}
      <button
        onClick={onLogout}
        style={{
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          color: 'var(--pico-primary)',
          textDecoration: 'underline',
        }}
      >
        Déconnexion
      </button>
    </nav>
  );
}

function NavLink({ href, currentPath, children }) {
  const isActive = currentPath === href;
  if (isActive) {
    return <span className="active" aria-current="page">{children}</span>;
  }
  return <Link href={href}>{children}</Link>;
}
