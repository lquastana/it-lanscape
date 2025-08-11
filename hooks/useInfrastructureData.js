import { useEffect, useState } from 'react';

export default function useInfrastructureData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/infrastructure')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e));
  }, []);

  return { data, error };
}
