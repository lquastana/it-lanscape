export default function Filters({ sets, filters, onChange }) {
  const handleMulti = (e) => {
    const values = Array.from(e.target.selectedOptions).map(o => o.value).filter(Boolean);
    onChange(e.target.name, values);
  };
  const handle = (e) => {
    onChange(e.target.name, e.target.value);
  };
  return (
    <div className="filters">
      <label>
        Établissement :
        <select name="etab" multiple size="4" value={filters.etab} onChange={handleMulti}>
          <option value="">Tous</option>
          {sets.etab.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Domaine :
        <select name="domaine" multiple size="4" value={filters.domaine} onChange={handleMulti}>
          <option value="">Tous</option>
          {sets.domaine.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Criticité :
        <select name="criticite" value={filters.criticite} onChange={handle}>
          <option value="">Tous</option>
          <option value="Standard">Standard</option>
          <option value="Critique">Critique</option>
        </select>
      </label>
      <label>
        Hébergement :
        <select name="heberg" value={filters.heberg} onChange={handle}>
          <option value="">Tous</option>
          {sets.heberg.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Interface :
        <select name="interface" value={filters.interface} onChange={handle}>
          <option value="">Toutes</option>
          {sets.interface.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label>
        Multi-établissement :
        <select name="multi" value={filters.multi} onChange={handle}>
          <option value="">Tous</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
      </label>
    </div>
  );
}
