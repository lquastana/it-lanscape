export default function Report({ metrics, visible, onClose }) {
  if (!visible) return null;
  return (
    <section id="report-box">
      <h2>Rapport</h2>
      <p>Applications visibles : {metrics.applications}</p>
      <button id="report-close" onClick={onClose}>Fermer</button>
    </section>
  );
}
