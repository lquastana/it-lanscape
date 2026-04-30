import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin-metier',    label: 'Vue métier' },
  { href: '/admin-flux',      label: 'Flux' },
  { href: '/admin-trigramme', label: 'Trigrammes' },
];

export default function AdminNav({ onLogout }) {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (!cancelled) setRole(data?.user?.role ?? null); })
      .catch(() => { if (!cancelled) setRole(null); });
    return () => { cancelled = true; };
  }, []);

  const currentPath = router.pathname;

  return (
    <nav className="view-switch admin-nav" aria-label="Navigation admin">
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
      <button className="nav-logout" onClick={onLogout}>
        Déconnexion
      </button>
    </nav>
  );
}

function NavLink({ href, currentPath, children }) {
  const isActive = currentPath === href;
  return (
    <Link href={href} className={isActive ? 'active' : undefined} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  );
}
