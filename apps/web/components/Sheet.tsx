'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import s from './Sheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** One sentence under the title. */
  lead?: ReactNode;
  children?: ReactNode;
}

export function Sheet({ open, onClose, title, lead, children }: Props): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog has no padding of its own, so a click on it (not its body) is a click on the scrim.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={s.body}>
        <div className={s.grab} />
        <h3 id={titleId} className={s.title}>
          {title}
        </h3>
        {lead && <p className={s.lead}>{lead}</p>}
        {children}
      </div>
    </dialog>
  );
}
