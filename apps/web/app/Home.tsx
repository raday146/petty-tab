'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ORDER, type Species } from '@petty-tab/art';
import { reelInput } from '@petty-tab/reel';
import { SENTENCES, type CrimeKey, type Me, type TabView, type VerdictView } from '@petty-tab/shared';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { registerServiceWorker } from '@/lib/pwa';
import { fetchRender, shareFile, whatsAppText } from '@/lib/share';
import { Intro } from '@/screens/Intro';
import { Notice } from '@/screens/Notice';
import { InviteSheet } from '@/screens/InviteSheet';
import { Picker } from '@/screens/Picker';
import { Story } from '@/screens/Story';
import { Tab } from '@/screens/Tab';
import { Verdict } from '@/screens/Verdict';
import s from './Home.module.css';

const noop = (): void => undefined;
const fullLink = (path: string): string => `${location.origin}${path}`;

/** What `/` opens to, by state (spec §4): intro and picker, the waiting tab, or the tab. */
export function Home(): ReactNode {
  const [me, setMe] = useState<Me>();
  // The invite sheet opens once, right after Start a tab.
  const [started, setStarted] = useState(false);
  // Offline (plan.md M6): a clear message over the cached shell; coming back online refetches everything.
  const [offline, setOffline] = useState(false);
  const refresh = useCallback(
    () =>
      api<Me>('/me').then(
        (next) => {
          setMe(next);
          setOffline(false);
        },
        () => setOffline(!navigator.onLine),
      ),
    [],
  );
  useEffect(() => void refresh(), [refresh]);
  useEffect(registerServiceWorker, []);
  useEffect(() => {
    const off = (): void => setOffline(true);
    const on = (): void => void refresh();
    addEventListener('offline', off);
    addEventListener('online', on);
    return () => {
      removeEventListener('offline', off);
      removeEventListener('online', on);
    };
  }, [refresh]);

  if (offline) {
    return (
      <Notice
        title="You're offline"
        lead="The tab catches up as soon as you're back."
        action="Try again"
        onAction={() => void refresh()}
      />
    );
  }
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
  const [verdict, setVerdict] = useState<VerdictView>();
  // The open verdict's id, so live updates refetch it without reopening the event stream.
  const verdictId = useRef<string>(undefined);
  const loadVerdict = useCallback((id: string) => {
    verdictId.current = id;
    return api<VerdictView>(`/verdicts/${id}`).then(setVerdict, noop);
  }, []);
  const [story, setStory] = useState(false);
  // spec §11: the rendered files of the open verdict's current sentence, fetched as soon as they are ready,
  // because the share sheet only opens from the tap itself.
  const [files, setFiles] = useState<{ of?: string; card?: File; reel?: File }>({});
  const of = verdict && `${verdict.id}:${verdict.sentence}`;
  const cardReady = !!verdict?.card;
  const reelReady = !!verdict?.reel;
  useEffect(() => {
    if (!of) return;
    const [id] = of.split(':') as [string];
    for (const kind of ['card', 'reel'] as const) {
      if (!(kind === 'card' ? cardReady : reelReady)) continue;
      void fetchRender(id, kind).then(
        (file) => setFiles((f) => ({ ...(f.of === of ? f : {}), of, [kind]: file })),
        noop,
      );
    }
  }, [of, cardReady, reelReady]);
  const ready = files.of === of ? files : {};

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
      if (verdictId.current) void loadVerdict(verdictId.current);
    };
    events.onmessage = sync;
    events.onopen = sync;
    return () => events.close();
  }, [refresh, loadTab, loadVerdict]);

  /** The viewer's own writes refetch too, so the tab stays right even if the stream drops. */
  const write = (path: string, init?: { method?: string; body?: unknown }): void =>
    void api(path, init).then(loadTab, loadTab);
  const file = async (crimeKey: CrimeKey): Promise<string> => {
    const { id } = await api<{ id: string }>('/charges', { body: { crimeKey } });
    void loadTab();
    return id;
  };

  if (verdict) {
    const v = `/verdicts/${verdict.id}`;
    const act = (path: string, init?: { method?: string; body?: unknown }): Promise<void> =>
      api(`${v}${path}`, init ?? { method: 'POST' }).then(
        () => loadVerdict(verdict.id),
        () => loadVerdict(verdict.id),
      );
    const sentence = verdict.sentence ?? 'coffee7';
    if (story && partner) {
      return (
        <Story
          reel={reelInput({ ...verdict, sentence })}
          viewer={member}
          partner={partner}
          onClose={() => setStory(false)}
        />
      );
    }
    return (
      <Verdict
        verdict={{ ...verdict, sentence }}
        viewer={verdict.viewer}
        ready={{ card: !!ready.card, reel: !!ready.reel }}
        onBack={() => {
          setStory(false);
          verdictId.current = undefined;
          setVerdict(undefined);
          void loadTab();
        }}
        onSentence={(sentenceKey) => void act('/sentence', { method: 'PATCH', body: { sentenceKey } })}
        onShare={(target) => {
          // spec §10: the share call goes first, so the winner's first share locks the sentence. It is not
          // awaited: the share sheet has to open inside this tap.
          void act('/shared');
          const file = target === 'card' ? ready.card : ready.reel;
          if (!file) return;
          if (target === 'story') setStory(true);
          if (target === 'whatsapp' && !navigator.canShare?.({ files: [file] })) {
            whatsAppText(`${verdict.loser.name} owes ${verdict.winner.name}: ${SENTENCES[sentence].title}`);
          } else shareFile(file);
        }}
        onServed={() => void act('/served')}
        onConfirm={() => void act('/confirm')}
      />
    );
  }
  if (editing) return <Edit me={me} onDone={() => refresh().then(() => setEditing(false))} />;
  return (
    <>
      <Tab
        me={member}
        them={partner ?? member}
        inviteLink={partner ? undefined : (link ?? '')}
        // The first week always ends on a Sunday (spec §10).
        firstVerdictDay={tab?.hasVerdict ? undefined : 'Sunday'}
        lead={tab?.lead ?? 0}
        meOwed={tab?.meOwed ?? []}
        themOwed={tab?.themOwed ?? []}
        charges={tab?.charges ?? []}
        unconfirmed={tab?.unconfirmed}
        onFile={partner ? file : undefined}
        onUndo={(id) => write(`/charges/${id}`, { method: 'DELETE' })}
        onPlea={(id, plea) => write(`/charges/${id}/plea`, { body: { plea } })}
        onDecide={(id, decision) => write(`/charges/${id}/appeal`, { body: { decision } })}
        onVerdict={() => void loadVerdict('latest')}
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
