'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import type { RulesSummary as RulesSummaryData } from '@petty-tab/shared';
import { Button } from '@/components/Button';
import { RulesSummary } from '@/components/RulesSummary';
import { Sheet } from '@/components/Sheet';
import { sfx } from '@/lib/sfx';
import { cx } from '@/lib/cx';
import s from './InviteSheet.module.css';

interface Props {
  open: boolean;
  /** `https://<host>/j/<token>` (spec §4.2). */
  link: string;
  /** spec §4: the rules the partner will accept by joining (step 3 of 3). */
  rules?: RulesSummaryData;
  onClose: () => void;
  onOpenTab: () => void;
}

const noop = (): (() => void) => () => undefined;

/** The link row: Share (system share sheet, when the phone has one) and Copy. Reused by the waiting card. */
export function InviteLink({ link }: { link: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  // Server render has no navigator; read it after hydration so the markup matches.
  const canShare = useSyncExternalStore(
    noop,
    () => 'share' in navigator,
    () => false,
  );
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      sfx.pop();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard refused (permissions): the link text is user-select: all, so a long-press still copies it.
    }
  };
  return (
    <div className={s.linkrow}>
      <span className={s.link}>{link.replace(/^https?:\/\//, '')}</span>
      {canShare && (
        <button
          type="button"
          className={s.share}
          onClick={() => navigator.share({ url: link }).catch(() => undefined)}
        >
          Share
        </button>
      )}
      <button type="button" className={cx(copied && s.done)} onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

export function InviteSheet({ open, link, rules, onClose, onOpenTab }: Props): ReactNode {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Invite your partner"
      lead="Send the link. They tap it, pick their animal, and you share one tab."
    >
      <InviteLink link={link} />
      {rules && (
        <p className={s.rules}>
          <RulesSummary rules={rules} side="inviter" />
        </p>
      )}
      <Button onClick={onOpenTab}>Open our tab</Button>
    </Sheet>
  );
}
