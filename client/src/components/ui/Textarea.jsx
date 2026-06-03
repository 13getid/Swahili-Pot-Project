export default function Textarea({ label, error, id, className = '', rows = 4, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-ink placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-brand-200 ${
          error ? 'border-[#dc2626]' : 'border-line focus:border-brand-500'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}
