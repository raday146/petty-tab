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

export function CheckIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={2.4} {...stroke} {...props}>
      <path d="M5 9.5l3 3 5.5-6.5" />
    </svg>
  );
}

export function SoundIcon({ on, ...props }: IconProps & { on: boolean }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} {...props}>
      <path d="M4 9.5v5h3.5l5 4v-13l-5 4Z" fill="currentColor" />
      <path d={on ? 'M16 9a4.2 4.2 0 0 1 0 6M18.8 6.5a8 8 0 0 1 0 11' : 'M16.5 9.5l5 5M21.5 9.5l-5 5'} />
    </svg>
  );
}

export function CloseIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2.4} {...stroke} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function HeartIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...props}>
      <path d="M12 20.5s-8-4.8-8-10.5a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.7-8 10.5-8 10.5Z" />
    </svg>
  );
}

export function SendIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={2} {...stroke} {...props}>
      <path d="M21 3L10 14M21 3l-7 18-4-7-7-4Z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M7 4.5v15l12.5-7.5Z" />
    </svg>
  );
}
