// InsightForge brand icon — analytics (pie chart + bars + magnifier + document)
export default function InsightIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Document (top-right) */}
      <rect x="34" y="4" width="22" height="28" rx="2" fill="#f0f0f0" stroke="#111" strokeWidth="2.2" />
      <line x1="38" y1="11" x2="52" y2="11" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="15" x2="52" y2="15" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="19" x2="48" y2="19" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="23" x2="50" y2="23" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      {/* Dog-ear fold */}
      <path d="M50 4 L56 10 L50 10 Z" fill="#ccc" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Pie chart (top-left) */}
      {/* Base circle */}
      <circle cx="16" cy="16" r="11" fill="#fff" stroke="#111" strokeWidth="2.2" />
      {/* Cyan slice (~120°) */}
      <path d="M16 16 L16 5 A11 11 0 0 1 25.5 21.5 Z" fill="#00BFFF" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Yellow slice (~120°) */}
      <path d="M16 16 L25.5 21.5 A11 11 0 0 1 6.5 22 Z" fill="#FFD700" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Red slice (~120°) */}
      <path d="M16 16 L6.5 22 A11 11 0 0 1 16 5 Z" fill="#FF6B6B" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Bar chart (bottom-left) */}
      {/* Baseline */}
      <line x1="4" y1="58" x2="32" y2="58" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      {/* Bar 1 — yellow */}
      <rect x="5"  y="50" width="5" height="8" rx="1" fill="#FFD700" stroke="#111" strokeWidth="1.5" />
      {/* Bar 2 — green */}
      <rect x="12" y="42" width="5" height="16" rx="1" fill="#3ECF7A" stroke="#111" strokeWidth="1.5" />
      {/* Bar 3 — cyan */}
      <rect x="19" y="46" width="5" height="12" rx="1" fill="#00BFFF" stroke="#111" strokeWidth="1.5" />
      {/* Bar 4 — red */}
      <rect x="26" y="52" width="5" height="6" rx="1" fill="#FF6B6B" stroke="#111" strokeWidth="1.5" />

      {/* Magnifying glass (center) */}
      <circle cx="37" cy="40" r="12" fill="#b8dff5" stroke="#555" strokeWidth="2.5" />
      <circle cx="37" cy="40" r="8" fill="#d8eef8" stroke="#111" strokeWidth="2" />
      {/* Check inside */}
      <polyline points="33,40 36,43 41,37" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Handle */}
      <line x1="46" y1="49" x2="55" y2="58" stroke="#666" strokeWidth="4" strokeLinecap="round" />
      <line x1="46" y1="49" x2="55" y2="58" stroke="#888" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
