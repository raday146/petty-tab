import type { ReactNode } from 'react';
import { Art } from '@/components/Art';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import s from './Notice.module.css';

/** M2's friendly pages (spec §4): a used or unknown invite link, or one opened while already in a pair. */
export function Notice({
  face,
  title,
  lead,
  action,
  onAction,
}: {
  /** Shown above the title: the inviter's animal on the join page's rules (spec §4.3). */
  face?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  action: string;
  onAction: () => void;
}): ReactNode {
  return (
    <Screen aria-label="Petty Tab">
      <div className={s.body}>
        {face && <div className={s.face}>{face}</div>}
        <h1 className={s.title}>{title}</h1>
        {lead && <p className={s.lead}>{lead}</p>}
      </div>
      <Art className={s.hero} draw={(art) => art.scenes.hero()} />
      <div className={s.cta}>
        <Button onClick={onAction}>{action}</Button>
      </div>
    </Screen>
  );
}
