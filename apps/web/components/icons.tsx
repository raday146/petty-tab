import type { ReactNode, SVGProps } from 'react';

// Plain UI glyphs the art package does not have (CLAUDE.md UI rules), copied from the prototype.
type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function BackIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2.6} {...stroke} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function DiceIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 32 32" strokeWidth={2.8} {...stroke} {...props}>
      <rect x="6" y="6" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function ReplayIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 32 32" strokeWidth={3} {...stroke} {...props}>
      <path d="M26 16a10 10 0 1 1-3.5-7.6" />
      <path d="M23.5 3v6h-6" />
    </svg>
  );
}

export function ShareIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} {...props}>
      <path d="M12 15V4M7.5 8L12 3.5 16.5 8M5 13v5a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18v-5" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} {...props}>
      <path d="M4 19.5l1.3-4A8 8 0 1 1 8.6 19Z" />
    </svg>
  );
}
