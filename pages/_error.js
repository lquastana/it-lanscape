import React from 'react';

function Error({ statusCode }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Erreur {statusCode || 500}</h1>
      <p>Une erreur est survenue.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res?.statusCode || err?.statusCode || 404;
  return { statusCode };
};

export default Error;
