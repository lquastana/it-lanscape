import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

export default function Filters({ sets, filters, onChange }) {
  // ---------------- Générique ---------------- //
  const handleText = (e) => onChange(e.target.name, e.target.value);

  const handleMulti = (e) => {
    const values = Array.from(e.target.selectedOptions)
      .map((o) => o.value)
      .filter(Boolean);
    onChange(e.target.name, values);
  };

  const reset = useCallback(() => {
    onChange('reset', null); // la logique reset est gérée dans le parent
  }, [onChange]);

  // ---------------- UI: états locaux ---------------- //
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchRef = useRef(null);

  // Raccourcis
  const fullWidth = { width: '100%' };
  const baseSelect = { ...fullWidth, padding: 6, borderRadius: 6 };

  const clearSearch = () => onChange('search', '');

  // Optionnel: touche "/" pour focus recherche
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Compteur d'éléments dans les filtres multi (feedback discret)
  const etabCount = useMemo(() => filters.etab?.length || 0, [filters.etab]);
  const domCount = useMemo(() => filters.domaine?.length || 0, [filters.domaine]);

  return (
    <>
      {/* Toolbar compacte */}
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

        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-panel"
          >
            Filtres avancés {showAdvanced ? '▴' : '▾'}
          </button>
          <button type="button" className="btn-reset" onClick={reset}>
            Réinitialiser
          </button>
        </div>
      </div>


      {/* Panneau Filtres avancés repliable */}
      <form
        id="advanced-panel"
        className={`filters-collapsible ${showAdvanced ? 'open' : ''}`}
        onSubmit={(e) => e.preventDefault()}
        role="region"
        aria-label="Filtres avancés"
      >
        <div className="filters-grid">
          {/* Établissement (multi) */}
          <label className="filter-item">
            <span>Établissement {etabCount ? <em className="count">({etabCount})</em> : null}</span>
            <select
              multiple
              size={4}
              name="etab"
              value={filters.etab}
              onChange={handleMulti}
              style={baseSelect}
              aria-label="Filtre établissement"
            >
              <option value="">Tous</option>
              {sets.etab.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          {/* Domaine (multi) */}
          <label className="filter-item">
            <span>Domaine {domCount ? <em className="count">({domCount})</em> : null}</span>
            <select
              multiple
              size={4}
              name="domaine"
              value={filters.domaine}
              onChange={handleMulti}
              style={baseSelect}
              aria-label="Filtre domaine"
            >
              <option value="">Tous</option>
              {sets.domaine.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          {/* Criticité */}
          <label className="filter-item">
            <span>Criticité</span>
            <select
              name="criticite"
              value={filters.criticite}
              onChange={handleText}
              style={baseSelect}
              aria-label="Filtre criticité"
            >
              <option value="">Tous</option>
              <option value="Standard">Standard</option>
              <option value="Critique">Critique</option>
            </select>
          </label>

          {/* Hébergement */}
          <label className="filter-item">
            <span>Hébergement</span>
            <select
              name="heberg"
              value={filters.heberg}
              onChange={handleText}
              style={baseSelect}
              aria-label="Filtre hébergement"
            >
              <option value="">Tous</option>
              {sets.heberg.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          {/* Interface */}
          <label className="filter-item">
            <span>Interface</span>
            <select
              name="interface"
              value={filters.interface}
              onChange={handleText}
              style={baseSelect}
              aria-label="Filtre interface"
            >
              <option value="">Toutes</option>
              {sets.interface.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          {/* Multi‑établissement */}
          <label className="filter-item">
            <span>Multi‑établissement</span>
            <select
              name="multi"
              value={filters.multi}
              onChange={handleText}
              style={baseSelect}
              aria-label="Filtre multi-établissement"
            >
              <option value="">Tous</option>
              <option value="Oui">Oui</option>
              <option value="Non">Non</option>
            </select>
          </label>
        </div>
      </form>
    </>
  );
}