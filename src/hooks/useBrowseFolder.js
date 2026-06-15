import { useState, useCallback } from 'react';
import { backend } from '@/api/backend';

// opens the native OS folder dialog (the server does it on this machine) and
// resolves to the chosen absolute path, or null if cancelled.
export function useBrowseFolder() {
  const [browsing, setBrowsing] = useState(false);
  const [error, setError] = useState('');

  const browse = useCallback(async () => {
    setError('');
    setBrowsing(true);
    try {
      const { path } = await backend.browseFolder();
      return path || null;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBrowsing(false);
    }
  }, []);

  return { browse, browsing, error };
}
