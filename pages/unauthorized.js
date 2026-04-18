import Link from 'next/link';
import { useRouter } from 'next/router';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { from, requiredRole } = router.query;
  const redirectedFrom = typeof from === 'string' ? from : '/';
  const roleText = typeof requiredRole === 'string' ? requiredRole : 'viewer';

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <article style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1>Accès interdit</h1>
        <p>
          Cette page nécessite le rôle <strong>{roleText}</strong> ou supérieur. Vous êtes
          actuellement connecté sans autorisation suffisante.
        </p>
        <p>
          <small>Page demandée : {redirectedFrom}</small>
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href={{
              pathname: '/login',
              query: { redirectedFrom },
            }}
            className="contrast"
          >
            Se connecter
          </Link>
          <Link href="/">Retour à l&apos;accueil</Link>
        </div>
      </article>
    </main>
  );
}
