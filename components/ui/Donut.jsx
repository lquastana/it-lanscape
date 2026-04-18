// components/ui/Donut.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Retourne une couleur fixe en fonction du tiers de pourcentage :
 * - Rouge pour 0-33%
 * - Jaune pour 34-66%
 * - Vert pour 67-100%
 * @param {number} pct
 * @returns {string} couleur CSS
 */
function getTierColor(pct) {
  const value = parseFloat(pct);
  if (value <= 33) return '#e74c3c';      // Rouge
  if (value <= 66) return '#f1c40f';      // Jaune
  return '#2ecc71';                       // Vert
}

/**
 * Donut KPI
 * @param {number|string} pct   Pourcentage (0‑100). Accepte string « xx.x ».
 * @param {string} label        Libellé sous le donut
 * @param {string} color        Couleur manuelle (#hex, rgb…), sinon auto
 */
export default function Donut({ pct = 0, label = '', color }) {
  const pctVal = parseFloat(pct).toFixed(1);
  const donutColor = color || getTierColor(pctVal);

  return (
    <div style={{ textAlign: 'center', minWidth: 120 }}>
      <span
        className="donut"
        style={{
          '--pct': pctVal,
          '--clr': donutColor,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `conic-gradient(${donutColor} ${pctVal}%, #eee 0)`,
          display: 'inline-block',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {pctVal}%
        </span>
      </span>
      <div style={{ marginTop: 4, fontSize: '.9rem' }}>{label}</div>
    </div>
  );
}

Donut.propTypes = {
  pct: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  label: PropTypes.string,
  color: PropTypes.string,
};
