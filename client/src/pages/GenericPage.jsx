import React from 'react';

export function GenericPage({ title, description }) {
  return (
    <section style={boxStyle}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
    </section>
  );
}

const boxStyle = {
  background: 'var(--color-card-bg)',
  borderRadius: 18,
  padding: 24,
  boxShadow: 'var(--card-shadow)',
  transition: 'background 0.3s, color 0.3s, box-shadow 0.3s',
};
