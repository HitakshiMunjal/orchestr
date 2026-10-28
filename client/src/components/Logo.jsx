export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="orchestrr-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.55" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0d1322" stroke="rgba(255,255,255,0.08)" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="url(#orchestrr-logo)" strokeWidth="6" />
      <path d="M32 16 L46 7" stroke="url(#orchestrr-logo)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5" fill="url(#orchestrr-logo)" />
    </svg>
  );
}
