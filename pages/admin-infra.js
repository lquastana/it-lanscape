import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminInfraRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin-metier'); }, [router]);
  return null;
}
