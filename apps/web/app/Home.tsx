'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ORDER, type Species } from '@petty-tab/art';
import type { CrimeKey, Me, TabView } from '@petty-tab/shared';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { Intro } from '@/screens/Intro';
import { InviteSheet } from '@/screens/InviteSheet';
import { Picker } from '@/screens/Picker';
import { Tab } from '@/screens/Tab';
import s from './Home.module.css';

const noop = (): void => undefined;
const fullLink = (path: string): string => `${location.origin}${path}`;

/** What `/` opens to, by state (spec §4): intro and picker, the waiting tab, or the tab. */
export function Home(): ReactNode {
  const [me, setMe] = useState<Me>();
  // The invite sheet opens once, right after Start a tab.
  const [started, setStarted] = useState(false);
  const refresh = useCallback(() => api<Me>('/me').then(setMe, noop), []);
  useEffect(() => void refresh(), [refresh]);

  if (!me) return null;
  if (!me.member || !me.pair) {
    return (
      <Start
        onStarted={(next) => {
          setStarted(true);
          setMe(next);
        }}
      />
    );
  }
  return <Pair me={me} refresh={refresh} sheetOpen={started} />;
}

function Start({ onStarted }: { onStarted: (me: Me) => void }): ReactNode {
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>(ORDER[0]!);
  if (!picking) return <Intro onStart={() => setPicking(true)} />;
  const start = async (): Promise<void> => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await api('/pairs', { body: { name, species, timezone } }).catch(noop);
    onStarted(await api<Me>('/me'));
  };
  return <Picker name={name} species={species} onName={setName} onSpecies={setSpecies} onContinue={start} />;
}

function Pair({
  me,
  refresh,
  sheetOpen,
}: {
  me: Me;
  refresh: () => Promise<void>;
  sheetOpen: boolean;
}): ReactNode {
  const member = me.member!;
  const partner = me.pair!.partner;
  const [link, setLink] = useState<string>();
  const [sheet, setSheet] = useState(sheetOpen);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabView>();
  const loadTab = useCallback(() => api<TabView>('/tab').then(setTab, noop), []);

  useEffect(() => {
    if (partner) void loadTab();
    else api<{ link: string }>('/pairs/invite').then(({ link }) => setLink(fullLink(link)), noop);
  }, [partner, loadTab]);

  // spec §14: any message (and every reconnect, which may have missed some) refetches the pair and the tab.
  useEffect(() => {
    const events = new EventSource('/api/events');
    const sync = (): void => {
      void refresh();
      void loadTab();
    };
    events.onmessage = sync;
    events.onopen = sync;
    return () => events.close();
  }, [refresh, loadTab]);

  /** The viewer's own writes refetch too, so the tab stays right even if the stream drops. */
  const write = (path: string, init?: { method?: string; body?: unknown }): void =>
    void api(path, init).then(loadTab, loadTab);
  const file = async (crimeKey: CrimeKey): Promise<string> => {
    const { id } = await api<{ id: string }>('/charges', { body: { crimeKey } });
    void loadTab();
    return id;
  };

  if (editing) return <Edit me={me} onDone={() => refresh().then(() => setEditing(false))} />;
  return (
    <>
      <Tab
        me={member}
        them={partner ?? member}
        inviteLink={partner ? undefined : (link ?? '')}
        firstVerdictDay="Sunday"
        lead={tab?.lead ?? 0}
        meOwed={tab?.meOwed ?? []}
        themOwed={tab?.themOwed ?? []}
        charges={tab?.charges ?? []}
        onFile={partner ? file : undefined}
        onUndo={(id) => write(`/charges/${id}`, { method: 'DELETE' })}
        onPlea={(id, plea) => write(`/charges/${id}/plea`, { body: { plea } })}
        onDecide={(id, decision) => write(`/charges/${id}/appeal`, { body: { decision } })}
        onVerdict={noop}
        onNewLink={() =>
          api<{ link: string }>('/pairs/invite', { method: 'POST' }).then(
            ({ link }) => setLink(fullLink(link)),
            noop,
          )
        }
        onEdit={() => setEditing(true)}
      />
      {link && (
        <InviteSheet
          open={sheet}
          link={link}
          onClose={() => setSheet(false)}
          onOpenTab={() => setSheet(false)}
        />
      )}
    </>
  );
}

/** spec §4.6–4.7: change your name or animal, or leave (the name chip opens this). */
function Edit({ me, onDone }: { me: Me; onDone: () => void }): ReactNode {
  const [name, setName] = useState(me.member!.name);
  const [species, setSpecies] = useState(me.member!.species);
  const [confirm, setConfirm] = useState(false);
  const partner = me.pair!.partner;
  const save = (): void =>
    void api('/members/me', { method: 'PATCH', body: { name, species } }).then(onDone, onDone);
  const leave = (): void => void api('/pairs/current', { method: 'DELETE' }).then(onDone, onDone);
  return (
    <Picker
      name={name}
      species={species}
      taken={partner ?? undefined}
      onName={setName}
      onSpecies={setSpecies}
      onContinue={save}
    >
      {confirm ? (
        <div className={s.confirm}>
          <p>This ends the tab for both of you.</p>
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Stay
          </Button>
          <Button onClick={leave}>Leave the tab</Button>
        </div>
      ) : (
        <button type="button" className={s.leave} onClick={() => setConfirm(true)}>
          Leave the tab
        </button>
      )}
    </Picker>
  );
}
