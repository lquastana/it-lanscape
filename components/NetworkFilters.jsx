import { useEffect, useRef } from 'react';

export default function NetworkFilters({ filters, onChange }) {
  const searchRef = useRef(null);
  const handleText = e => onChange('search', e.target.value);
  const clearSearch = () => onChange('search', '');
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
    <div className="filters-toolbar">
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
    </div>
  );
}
