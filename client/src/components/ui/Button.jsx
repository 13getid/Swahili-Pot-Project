const VARIANTS = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 border border-transparent disabled:opacity-50',
  secondary:
    'bg-card text-brand-600 border border-brand-600 hover:bg-accentSoft disabled:opacity-50',
  danger:
    'bg-[#dc2626] text-white hover:bg-red-700 border border-transparent disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-hover border border-transparent',
};

export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
