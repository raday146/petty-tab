import { useId, type CSSProperties, type ReactNode } from 'react';
import { createArt, type Art as ArtApi } from '@petty-tab/art';
import { cx } from '@/lib/cx';
import s from './Art.module.css';

interface Props {
  /** Builds the markup from this component's own renderer. Never pass user text into it. */
  draw: (art: ArtApi) => string;
  /** Text alternative (may contain names). Without it the art is decorative. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** One `createArt` per rendered component, prefixed by `useId()`, so clip ids are unique and SSR-stable. */
export function Art({ draw, label, className, style }: Props): ReactNode {
  const svg = draw(createArt({ idPrefix: useId().replace(/[^A-Za-z0-9_-]/g, '') }));
  return (
    <span
      className={cx(s.art, className)}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // Safe: art markup never contains user input (packages/art/README.md).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
