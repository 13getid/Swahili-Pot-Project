// SwahiliPot wordmark. `size` historically referred to the text size of the
// placeholder; here it maps to a sensible rendered logo height so existing
// call sites (sidebar=18, login/attend=24) keep working without changes.
const HEIGHTS = {
  18: 28,
  24: 40,
};

export default function Logo({ size = 18, height, className = '' }) {
  const h = height || HEIGHTS[size] || Math.round(size * 1.6);
  return (
    <img
      src="/sph-logo.png"
      alt="SwahiliPot Hub Foundation"
      height={h}
      style={{ height: h, width: 'auto' }}
      className={className}
    />
  );
}
