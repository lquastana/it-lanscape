// components/Filters.jsx
import { useCallback } from 'react';

export default function Filters({ sets, filters, onChange }) {
  /* -------- gestion générique -------- */
  const handleText = (e) => onChange(e.target.name, e.target.value);

  const handleMulti = (e) => {
    const values = Array.from(e.target.selectedOptions)
      .map(o => o.value)
      .filter(Boolean);
    onChange(e.target.name, values);
  };

  const reset = useCallback(() => {
    onChange('reset', null);          // <-- la logique de reset est gérée dans le parent
  }, [onChange]);

  /* -------- raccourcis réutilisables -------- */
  const fullWidth = { width: '100%' };
  const baseSelect = { ...fullWidth, padding: 6, borderRadius: 6 };

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      {/* Établissement (multi) */}
      <label className="filter-item">
        <span>Établissement</span>
        <select
          multiple
          size={4}
          name="etab"
          value={filters.etab}
          onChange={handleMulti}
          style={baseSelect}
        >
          <option value="">Tous</option>
          {sets.etab.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>

      {/* Domaine (multi) */}
      <label className="filter-item">
        <span>Domaine</span>
        <select
          multiple
          size={4}
          name="domaine"
          value={filters.domaine}
          onChange={handleMulti}
          style={baseSelect}
        >
          <option value="">Tous</option>
          {sets.domaine.map(v => <option key={v} value={v}>{v}</option>)}
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
        >
          <option value="">Tous</option>
          {sets.heberg.map(v => <option key={v} value={v}>{v}</option>)}
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
        >
          <option value="">Toutes</option>
          {sets.interface.map(v => <option key={v} value={v}>{v}</option>)}
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
        >
          <option value="">Tous</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
      </label>

      {/* bouton reset */}
      <div className="filter-actions">
        <button type="button" onClick={reset}>Réinitialiser</button>
      </div>
    </form>
  );
}
