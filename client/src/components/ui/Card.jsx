export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-line bg-card shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
