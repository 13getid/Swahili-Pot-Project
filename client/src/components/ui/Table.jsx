export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-line bg-card ${className}`}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="border-b border-line bg-canvas">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({ children, className = '' }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, index = 0, className = '', ...props }) {
  // Alternating row backgrounds using the off-white color.
  const zebra = index % 2 === 1 ? 'bg-canvas' : 'bg-card';
  return (
    <tr className={`border-b border-line last:border-0 ${zebra} ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TD({ children, className = '' }) {
  return <td className={`px-4 py-3 align-middle text-ink ${className}`}>{children}</td>;
}
