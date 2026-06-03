export default function Spinner({ size = 32 }) {
  return (
    <div className="flex items-center justify-center py-8" role="status" aria-label="Loading">
      <div
        className="animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
