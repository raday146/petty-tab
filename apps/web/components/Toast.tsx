'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './Toast.module.css';

export interface ToastData {
  title: ReactNode;
  message: ReactNode;
  /** Adds the Undo action; the toast then stays 10 s instead of 2.7 s (design.md §5). */
  onUndo?: () => void;
}

interface ToastState {
  data: ToastData | null;
  open: boolean;
  /** Bumped on every show, so a new toast restarts the timer. */
  seq: number;
}

/** Holds the toast. `hide()` slides it out but keeps the text, so it does not blank mid-animation. */
export function useToast(): {
  toast: ToastState;
  show: (data: ToastData) => void;
  hide: () => void;
} {
  const [toast, setToast] = useState<ToastState>({ data: null, open: false, seq: 0 });
  const show = useCallback((data: ToastData) => setToast((t) => ({ data, open: true, seq: t.seq + 1 })), []);
  const hide = useCallback(() => setToast((t) => ({ ...t, open: false })), []);
  return { toast, show, hide };
}

export function Toast({ toast, onHide }: { toast: ToastState; onHide: () => void }): ReactNode {
  const { data, open, seq } = toast;
  const undo = data?.onUndo;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onHide, undo ? 10_000 : 2_700);
    return () => clearTimeout(timer);
  }, [open, seq, undo, onHide]);

  return (
    <div className={cx(s.toast, open && s.show)} role="status" aria-hidden={!open}>
      {data && (
        <>
          <div className={s.text}>
            <b className={s.title}>{data.title}</b>
            {data.message}
          </div>
          {undo && open && (
            <button
              type="button"
              className={s.undo}
              onClick={() => {
                undo();
                onHide();
              }}
            >
              Undo
            </button>
          )}
        </>
      )}
    </div>
  );
}
