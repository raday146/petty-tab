'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER, type Species } from '@petty-tab/art';
import { reelInput } from '@petty-tab/reel';
import { CRIMES, type CrimeKey } from '@petty-tab/shared';
import type { Member, Owed } from '@/components/tab/Scoreboard';
import { Intro } from '@/screens/Intro';
import { InviteSheet } from '@/screens/InviteSheet';
import { Picker } from '@/screens/Picker';
import { Tab, type TabCharge } from '@/screens/Tab';
import { Story } from '@/screens/Story';
import { Verdict } from '@/screens/Verdict';
import * as mock from './mocks';

type Query = Record<string, string | undefined>;

const species = (value: string | undefined, fallback: Species): Species =>
  (ORDER as string[]).includes(value ?? '') ? (value as Species) : fallback;

/**
 * Holds mock state for one screen; M2+ replace this with real data.
 * `?me=&meSp=&them=&themSp=` swap the household; on `verdict`, `?view=` is winner (default), loser, locked,
 * served (loser marked it), confirmed or tie. On `story`, `?t=` holds the reel at that time (default 5.5).
 */
export function DevScreen({ name, query }: { name: mock.ScreenName; query: Query }): ReactNode {
  const router = useRouter();
  const go = (to: string): void => router.push(`/dev/screens/${to}`);
  const me: Member = { name: query.me ?? mock.MAYA.name, species: species(query.meSp, mock.MAYA.species) };
  const them: Member = {
    name: query.them ?? mock.ALEX.name,
    species: species(query.themSp, mock.ALEX.species),
  };

  switch (name) {
    case 'intro':
      return <Intro onStart={() => go('picker')} />;
    case 'invite':
      return <InviteDemo />;
    case 'picker':
      return <PickerDemo me={me} them={them} onContinue={() => go('invite')} />;
    case 'tab':
      return <TabDemo me={me} them={them} week={mock.WEEK} score={mock.SCORE} />;
    case 'plea':
      return <TabDemo me={me} them={them} week={mock.PLEA_WEEK} score={mock.PLEA_SCORE} />;
    case 'appeal':
      return <TabDemo me={me} them={them} week={mock.APPEAL_WEEK} score={mock.SCORE} />;
    case 'waiting':
      return <TabDemo me={me} them={them} week={[]} score={mock.SCORE} waiting />;
    case 'verdict':
      return <VerdictDemo me={me} them={them} view={query.view} />;
    case 'story':
      return (
        <Story
          reel={reelInput({ ...mock.VERDICT, winner: me, loser: them })}
          viewer={me}
          partner={them}
          still={Number(query.t ?? 5.5)}
          onClose={() => go('verdict')}
        />
      );
  }
}

function InviteDemo(): ReactNode {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Intro onStart={() => setOpen(true)} />
      <InviteSheet
        open={open}
        link={mock.INVITE_LINK}
        onClose={() => setOpen(false)}
        onOpenTab={() => setOpen(false)}
      />
    </>
  );
}

function PickerDemo({
  me,
  them,
  onContinue,
}: {
  me: Member;
  them: Member;
  onContinue: () => void;
}): ReactNode {
  const [name, setName] = useState(me.name);
  const [sp, setSp] = useState(me.species);
  // Joining the partner's tab: their animal is taken (spec §4.3), as in reference screens 03–05.
  return (
    <Picker
      name={name}
      species={sp}
      taken={them}
      onName={setName}
      onSpecies={setSp}
      onContinue={onContinue}
    />
  );
}

function addOwed(owed: Owed, unit: CrimeKey, delta: number): Owed {
  const u = CRIMES[unit].unit;
  const has = owed.some((o) => o.unit === u);
  const next = has
    ? owed.map((o) => (o.unit === u ? { ...o, count: o.count + delta } : o))
    : [...owed, { unit: u, count: delta }];
  return next.filter((o) => o.count > 0);
}

function TabDemo(props: {
  me: Member;
  them: Member;
  week: TabCharge[];
  score: typeof mock.SCORE;
  waiting?: boolean;
}): ReactNode {
  const router = useRouter();
  const [charges, setCharges] = useState(props.week);
  const [score, setScore] = useState(props.score);
  const [seq, setSeq] = useState(0);
  const status = (id: string, s: TabCharge['status']): void =>
    setCharges((cs) => cs.map((c) => (c.id === id ? { ...c, status: s } : c)));
  const filed = (crime: CrimeKey, delta: 1 | -1): void =>
    setScore((sc) => ({ ...sc, lead: sc.lead + delta, meOwed: addOwed(sc.meOwed, crime, delta) }));

  return (
    <Tab
      me={props.me}
      them={props.them}
      inviteLink={props.waiting ? mock.INVITE_LINK : undefined}
      firstVerdict={props.waiting}
      lead={score.lead}
      meOwed={score.meOwed}
      themOwed={score.themOwed}
      charges={charges}
      onFile={(crime) => {
        const id = `new-${seq}`;
        setSeq(seq + 1);
        setCharges((cs) => [{ id, crime, status: 'pending', filer: 'me' }, ...cs]);
        filed(crime as CrimeKey, 1);
        return id;
      }}
      onUndo={(id, crime) => {
        setCharges((cs) => cs.filter((c) => c.id !== id));
        filed(crime as CrimeKey, -1);
      }}
      onPlea={(id, plea) => status(id, plea === 'guilty' ? 'guilty' : 'appealed')}
      onDecide={(id, decision) => status(id, decision === 'uphold' ? 'upheld' : 'dropped')}
      onVerdict={() => router.push('/dev/screens/verdict')}
      onNewLink={() => undefined}
    />
  );
}

function VerdictDemo({ me, them, view = 'winner' }: { me: Member; them: Member; view?: string }): ReactNode {
  const router = useRouter();
  const [verdict, setVerdict] = useState({
    ...mock.VERDICT,
    winner: me,
    loser: them,
    tie: view === 'tie',
    locked: view === 'locked',
    served: view === 'served' || view === 'confirmed',
    confirmed: view === 'confirmed',
  });
  const viewer = view === 'loser' ? 'loser' : 'winner';
  return (
    <Verdict
      verdict={verdict}
      viewer={viewer}
      onBack={() => router.push('/dev/screens/tab')}
      onSentence={(sentence) => setVerdict((v) => ({ ...v, sentence }))}
      // spec §10: the winner's first share locks the sentence; the loser's does not.
      onShare={() => viewer === 'winner' && setVerdict((v) => ({ ...v, locked: true }))}
      onServed={() => setVerdict((v) => ({ ...v, served: true }))}
      onConfirm={() => setVerdict((v) => ({ ...v, confirmed: true }))}
    />
  );
}
