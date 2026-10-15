'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ORDER, type Species } from '@petty-tab/art';
import { reelInput } from '@petty-tab/reel';
import {
  SENTENCES,
  type BreakdownView,
  type InvitePreview,
  type Me,
  type RulesInput,
  type TabEvent,
  type TabView,
  type VerdictView,
} from '@petty-tab/shared';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import {
  canInstall,
  disablePush,
  enablePush,
  install,
  isInstalled,
  isIPhone,
  pushState,
  registerServiceWorker,
  type PushState,
} from '@/lib/pwa';
import { setSound, sfx, soundIsOn } from '@/lib/sfx';
import { fetchRender, shareFile, whatsAppText } from '@/lib/share';
import { Breakdown } from '@/screens/Breakdown';
import { Intro } from '@/screens/Intro';
import { Notice } from '@/screens/Notice';
import { Sheet } from '@/components/Sheet';
import { InviteSheet } from '@/screens/InviteSheet';
import { Picker } from '@/screens/Picker';
import { Setup } from '@/screens/Setup';
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
  // Offline (plan.md M6), or online but the server cannot be reached (a dead link, the server down): a clear
  // message with a retry instead of a blank page. Coming back online refetches everything.
  const [down, setDown] = useState<'offline' | 'unreachable'>();
  const refresh = useCallback(
    () =>
      api<Me>('/me').then(
        (next) => {
          setMe(next);
          setDown(undefined);
        },
        () => setDown(navigator.onLine ? 'unreachable' : 'offline'),
      ),
    [],
  );
  useEffect(() => void refresh(), [refresh]);
  useEffect(registerServiceWorker, []);
  useEffect(() => {
    const off = (): void => setDown('offline');
    const on = (): void => void refresh();
    addEventListener('offline', off);
    addEventListener('online', on);
    return () => {
      removeEventListener('offline', off);
      removeEventListener('online', on);
    };
  }, [refresh]);

  if (down) {
    return (
      <Notice
        title={down === 'offline' ? "You're offline" : "Can't reach the tab"}
        lead={
          down === 'offline'
            ? "The tab catches up as soon as you're back."
            : 'The server is not answering. Check your connection or the link, then try again.'
        }
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

/** spec §4: the setup wizard. 1 name and animal, 2 the rules, 3 the invite (the waiting tab's sheet). */
function Start({ onStarted }: { onStarted: (me: Me) => void }): ReactNode {
  const [step, setStep] = useState<'intro' | 'identity' | 'setup'>('intro');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>(ORDER[0]!);
  if (step === 'intro') return <Intro onStart={() => setStep('identity')} />;
  if (step === 'setup') {
    const create = async (rules: RulesInput): Promise<void> => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api('/pairs', { body: { name, species, timezone, rules } }).catch(noop);
      onStarted(await api<Me>('/me'));
    };
    return <Setup onBack={() => setStep('identity')} onCreate={create} />;
  }
  return (
    <Picker
      step={1}
      name={name}
      species={species}
      onName={setName}
      onSpecies={setSpecies}
      onContinue={() => setStep('setup')}
    />
  );
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
  // spec §4: the rules on the invite sheet, read back from the link's own preview.
  const [rules, setRules] = useState<InvitePreview['rules']>();
  useEffect(() => {
    if (!link) return;
    api<InvitePreview>(`/invites/${encodeURIComponent(link.split('/j/')[1]!)}`).then(
      (p) => setRules(p.rules),
      noop,
    );
  }, [link]);
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
  // The Breakdown screen: open (its data may still be loading) or closed.
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownView>();
  const breakdownShown = useRef(false);
  const loadBreakdown = useCallback(() => api<BreakdownView>('/breakdown').then(setBreakdown, noop), []);
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
      if (breakdownShown.current) void loadBreakdown();
    };
    events.onmessage = (m: MessageEvent<string>) => {
      sync();
      // spec §10: a settle-now verdict opens on both phones; a verdict at the deadline waits for the chip.
      if ((JSON.parse(m.data) as TabEvent).type === 'verdict.settled') void loadVerdict('latest');
    };
    events.onopen = sync;
    return () => events.close();
  }, [refresh, loadTab, loadVerdict, loadBreakdown]);

  /** The viewer's own writes refetch too, so the tab stays right even if the stream drops. */
  const write = (path: string, init?: { method?: string; body?: unknown }): void =>
    void api(path, init).then(loadTab, loadTab);
  const file = async (crimeKey: string): Promise<string> => {
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
  if (breakdownOpen && partner) {
    return (
      <Breakdown
        view={breakdown}
        me={member}
        them={partner}
        meOwed={tab?.meOwed ?? []}
        themOwed={tab?.themOwed ?? []}
        onBack={() => {
          breakdownShown.current = false;
          setBreakdownOpen(false);
        }}
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
        firstVerdict={!tab?.hasVerdict}
        deadline={tab?.deadline.label}
        proposal={tab?.proposal}
        hasVerdict={tab?.hasVerdict}
        onPropose={
          partner ? (end) => api<void>('/deadline/proposal', { body: { end } }).finally(loadTab) : undefined
        }
        onAnswer={(yes) =>
          void api(`/deadline/proposal/${yes ? 'accept' : 'decline'}`, { method: 'POST' }).then(
            // The accepter opens a settled verdict too, even if the stream is down.
            () => (yes && tab?.proposal?.end === null ? loadVerdict('latest') : loadTab()),
            loadTab,
          )
        }
        onWithdraw={() => write('/deadline/proposal', { method: 'DELETE' })}
        lead={tab?.lead ?? 0}
        meOwed={tab?.meOwed ?? []}
        themOwed={tab?.themOwed ?? []}
        charges={tab?.charges ?? []}
        unconfirmed={tab?.unconfirmed}
        onFile={partner ? file : undefined}
        onUndo={(id) => write(`/charges/${id}`, { method: 'DELETE' })}
        custom={tab?.custom}
        crimesOff={tab?.crimesOff}
        cycleDays={tab?.cycleDays}
        onBreakdown={() => {
          breakdownShown.current = true;
          setBreakdownOpen(true);
          void loadBreakdown();
        }}
        onCreateCrime={(body) => api<{ id: string }>('/crimes', { body }).then(() => loadTab())}
        onRemoveCrime={(id) => write(`/crimes/${id}`, { method: 'DELETE' })}
        onChore={(id, done) => write(`/chores/${id}/done`, { method: done ? 'POST' : 'DELETE' })}
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
      {partner && <StayInTheLoop partner={partner.name} />}
      {link && (
        <InviteSheet
          open={sheet}
          link={link}
          rules={rules}
          onClose={() => setSheet(false)}
          onOpenTab={() => setSheet(false)}
        />
      )}
    </>
  );
}

/** spec §4.6–4.8: change your name or animal, leave, or delete everything (the name chip opens this). */
function Edit({ me, onDone }: { me: Me; onDone: () => void }): ReactNode {
  const [name, setName] = useState(me.member!.name);
  const [species, setSpecies] = useState(me.member!.species);
  const [confirm, setConfirm] = useState<'leave' | 'delete'>();
  const partner = me.pair!.partner;
  const save = (): void =>
    void api('/members/me', { method: 'PATCH', body: { name, species } }).then(onDone, onDone);
  const leave = (): void => void api('/pairs/current', { method: 'DELETE' }).then(onDone, onDone);
  const deleteAll = (): void =>
    void api('/me', { method: 'DELETE' }).then(() => {
      try {
        localStorage.clear();
      } catch {}
      onDone();
    }, onDone);
  return (
    <Picker
      name={name}
      species={species}
      taken={partner ?? undefined}
      onName={setName}
      onSpecies={setSpecies}
      onContinue={save}
    >
      <Settings />
      {confirm === 'leave' ? (
        <div className={s.confirm}>
          <p>This ends the tab for both of you.</p>
          <Button variant="outline" onClick={() => setConfirm(undefined)}>
            Stay
          </Button>
          <Button onClick={leave}>Leave the tab</Button>
        </div>
      ) : confirm === 'delete' ? (
        <div className={s.confirm}>
          <p>
            Your tabs, verdicts and this phone&rsquo;s place in Petty Tab are deleted for good.
            {partner && (
              <>
                {' '}
                <bdi>{partner.name}</bdi>&rsquo;s tab ends too.
              </>
            )}
          </p>
          <Button variant="outline" onClick={() => setConfirm(undefined)}>
            Keep it
          </Button>
          <Button onClick={deleteAll}>Delete everything</Button>
        </div>
      ) : (
        <>
          <button type="button" className={s.leave} onClick={() => setConfirm('leave')}>
            Leave the tab
          </button>
          <button type="button" className={s.leave} onClick={() => setConfirm('delete')}>
            Delete everything
          </button>
        </>
      )}
    </Picker>
  );
}

/** design.md §8 and spec §12: this device's sound and notifications, on the edit screen (the settings). */
function Settings(): ReactNode {
  const [sound, setSoundOn] = useState(soundIsOn);
  const [push, setPush] = useState<PushState>();
  useEffect(() => void pushState().then(setPush), []);
  const togglePush = (): void =>
    void (push === 'on' ? disablePush() : enablePush()).then(setPush, () => pushState().then(setPush));
  return (
    <div className={s.settings}>
      <div className={s.toggles}>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={sound}
          onClick={() => {
            setSound(!sound);
            setSoundOn(!sound);
            if (!sound) sfx.pop();
          }}
        >
          Sound: {sound ? 'on' : 'off'}
        </button>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={push === 'on'}
          disabled={!push || push === 'unsupported' || push === 'blocked'}
          onClick={togglePush}
        >
          Notifications: {push === 'on' ? 'on' : 'off'}
        </button>
      </div>
      {push === 'unsupported' && (
        <p className={s.hint}>
          {isIPhone()
            ? 'On iPhone, notifications work once Petty Tab is on your Home Screen.'
            : 'This browser cannot show notifications.'}
        </p>
      )}
      {push === 'blocked' && <p className={s.hint}>Notifications are blocked in your browser settings.</p>}
    </div>
  );
}

const ASKED = 'pt-asked';
const asked = (): boolean => {
  try {
    return localStorage.getItem(ASKED) === '1';
  } catch {
    return true;
  }
};

/**
 * spec §12: once the pair completes, a one-time offer to turn notifications on. On an iPhone outside the
 * Home Screen it explains how to add it first (push only works there); Android can install from here.
 */
function StayInTheLoop({ partner }: { partner: string }): ReactNode {
  const [mode, setMode] = useState<'iphone' | 'push'>();
  useEffect(() => {
    if (asked()) return;
    void pushState().then((state) => {
      if (state === 'off') setMode('push');
      else if (state === 'unsupported' && isIPhone() && !isInstalled()) setMode('iphone');
    });
  }, []);
  const close = (): void => {
    try {
      localStorage.setItem(ASKED, '1');
    } catch {
      // Storage blocked: the offer may come back next visit.
    }
    setMode(undefined);
  };
  if (mode === 'iphone') {
    return (
      <Sheet
        open
        onClose={close}
        title="Add Petty Tab to your Home Screen"
        lead="On iPhone, that is how you hear about charges and the verdict: tap Share, then Add to Home Screen."
      >
        <Button onClick={close}>Got it</Button>
      </Sheet>
    );
  }
  return (
    <Sheet
      open={mode === 'push'}
      onClose={close}
      title="Know when you're charged"
      lead={
        <>
          A ping when <bdi>{partner}</bdi> logs a crime or cries foul, and when the verdict is in.
        </>
      }
    >
      <div className={s.offer}>
        <Button onClick={() => void enablePush().finally(close)}>Turn on notifications</Button>
        {canInstall() ? (
          <Button variant="outline" onClick={install}>
            Install the app
          </Button>
        ) : (
          <Button variant="outline" onClick={close}>
            Not now
          </Button>
        )}
      </div>
    </Sheet>
  );
}
