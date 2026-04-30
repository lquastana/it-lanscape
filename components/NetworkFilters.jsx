import { useEffect, useRef } from 'react';

export default function NetworkFilters({ filters, onChange }) {
  const searchRef = useRef(null);
  const handleText = e => onChange('search', e.target.value);
  const clearSearch = () => onChange('search', '');
  const handleMode = e => onChange('mode', e.target.value);
  useEffect(() => {
    const onKey = e => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="filters-toolbar network-filters-toolbar">
      <div className="search-compact">
        <input
          ref={searchRef}
          className="search-input"
          type="text"
          name="search"
          value={filters.search}
          onChange={handleText}
          placeholder="Rechercher… (/)"
          aria-label="Recherche par mot-clé"
        />
        {filters.search?.length > 0 && (
          <button
            type="button"
            className="search-clear"
            onClick={clearSearch}
            aria-label="Effacer la recherche"
            title="Effacer"
          >
            ✖
          </button>
        )}
      </div>
      <div className="search-mode">
        <label>
          <input
            type="radio"
            name="mode"
            value="vlan"
            checked={filters.mode === 'vlan'}
            onChange={handleMode}
          />
          VLAN
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="server"
            checked={filters.mode === 'server'}
            onChange={handleMode}
          />
          Serveur
        </label>
      </div>
    </div>
  );
}
