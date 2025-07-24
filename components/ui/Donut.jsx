// components/ui/Donut.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Donut KPI
 * @param {number|string} pct   Pourcentage (0‑100). On accepte aussi une string déjà « xx.x ».
 * @param {string} label        Libellé sous le donut
 * @param {string} color        Couleur principale (#hex, rgb…)
 */
export default function Donut({ pct = 0, label = '', color = '#1B75BC' }) {
  // on fige le pourcentage sur une décimale max
  const pctVal = Number(pct).toFixed(1);

  return (
    <div style={{ textAlign: 'center', minWidth: 120 }}>
      <span
        className="donut"
        style={{
          '--pct': pctVal,
          '--clr': color,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `conic-gradient(${color} ${pctVal}%, #eee 0)`,
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
