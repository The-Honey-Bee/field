import React from 'react';

interface FlagProps {
  className?: string;
  size?: number;
}

/**
 * United Kingdom (Union Jack) Flag Icon for English (EN)
 */
export const UKFlag: React.FC<FlagProps> = ({ className = 'w-5 h-3.5', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 30"
      className={`rounded-xs object-cover shadow-xs border border-white/20 inline-block shrink-0 ${className}`}
      style={size ? { width: size, height: (size * 3) / 5 } : undefined}
      aria-label="United Kingdom Flag"
    >
      <clipPath id="uk-clip">
        <rect width="60" height="30" rx="2" />
      </clipPath>
      <g clipPath="url(#uk-clip)">
        {/* Navy Blue Base */}
        <rect width="60" height="30" fill="#012169" />
        {/* White Saltire (Diagonals) */}
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        {/* Red Saltire (St. Patrick) */}
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
        {/* White Cross (St. George border) */}
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        {/* Red Cross (St. George) */}
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
};

/**
 * Tanzania Flag Icon for Kiswahili (SW)
 * Accurate colors: Green (upper left), Blue (lower right), Black diagonal stripe bordered by Yellow stripes
 */
export const TanzaniaFlag: React.FC<FlagProps> = ({ className = 'w-5 h-3.5', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 40"
      className={`rounded-xs object-cover shadow-xs border border-white/20 inline-block shrink-0 ${className}`}
      style={size ? { width: size, height: (size * 2) / 3 } : undefined}
      aria-label="Tanzania Flag"
    >
      <clipPath id="tz-clip">
        <rect width="60" height="40" rx="2" />
      </clipPath>
      <g clipPath="url(#tz-clip)">
        {/* Green Upper-Hoist Triangle */}
        <polygon points="0,0 60,0 0,40" fill="#1EB53A" />
        {/* Blue Lower-Fly Triangle */}
        <polygon points="60,0 60,40 0,40" fill="#00A3DD" />
        {/* Yellow Diagonal Border */}
        <polygon points="0,40 0,27 40,0 60,0 60,13 20,40" fill="#FCD116" />
        {/* Black Central Diagonal Stripe */}
        <polygon points="0,40 0,30 45,0 60,0 60,10 15,40" fill="#000000" />
      </g>
    </svg>
  );
};
