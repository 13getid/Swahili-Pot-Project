// Semantic colors at 15% opacity background with full-color text.
const COLORS = {
  blue: { bg: 'rgba(30, 64, 175, 0.15)', text: '#1e40af' },
  green: { bg: 'rgba(22, 163, 74, 0.15)', text: '#16a34a' },
  amber: { bg: 'rgba(217, 119, 6, 0.15)', text: '#d97706' },
  red: { bg: 'rgba(220, 38, 38, 0.15)', text: '#dc2626' },
  gray: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' },
};

const STATUS_MAP = {
  submitted: 'blue',
  acknowledged: 'green',
  returned: 'amber',
  open: 'red',
  resolved: 'green',
  active: 'green',
  inactive: 'gray',
  expired: 'gray',
  low: 'green',
  medium: 'amber',
  high: 'red',
  pending: 'amber',
  confirmed: 'green',
};

const LABELS = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  returned: 'Returned',
  open: 'Open',
  resolved: 'Resolved',
  active: 'Active',
  inactive: 'Inactive',
  expired: 'Expired',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  pending: 'Pending',
  confirmed: 'Confirmed',
};

export default function Badge({ status, variant, children }) {
  const colorKey = variant || STATUS_MAP[status] || 'gray';
  const { bg, text } = COLORS[colorKey] || COLORS.gray;
  const label = children || LABELS[status] || status;

  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
