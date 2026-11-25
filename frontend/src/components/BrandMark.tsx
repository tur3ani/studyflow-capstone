interface BrandMarkProps {
  size?: number;
}

/**
 * Geometric angular triangular fragment mark with Electric Iris (#8052ff) -> Deep Verdant (#15846e) gradient,
 * echoing the chromatic triangle constellation visual identity.
 */
export function BrandMark({ size = 26 }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="studyflow-prism" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8052ff" />
          <stop offset="65%" stopColor="#4f6fd8" />
          <stop offset="100%" stopColor="#15846e" />
        </linearGradient>
      </defs>
      {/* Primary angular shard */}
      <polygon points="16,3 29,25 16,21" fill="url(#studyflow-prism)" />
      {/* Secondary facet */}
      <polygon points="16,3 16,21 4,25" fill="#8052ff" fillOpacity="0.62" />
      {/* Saffron spark vertex */}
      <polygon points="16,23.5 21,28.5 11,28.5" stroke="#ffb829" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
