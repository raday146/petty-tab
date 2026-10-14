import type { StickerKey } from '@petty-tab/art';
import { crimeInfo, type ChargeStatus, type CrimeBook, type TopCrime } from './catalog.ts';
import { counts } from './score.ts';

/** A playful line. `name`, when set, opens the sentence (the UI wraps it in <bdi>). */
export type Quip = { name?: string; text: string };

export interface BreakdownSide {
  /** What this person was charged with this week, counting charges only, most first. */
  crimes: { title: string; sticker: StickerKey; count: number }[];
  total: number;
  /** Charges against them the filer let slide. */
  slid: number;
  quip: Quip;
}

/** `GET /api/breakdown`: the Breakdown screen from the viewer's side. */
export interface BreakdownView {
  week: { me: BreakdownSide; them: BreakdownSide };
  /** This cycle's chores: days ticked done and days charged as neglected. */
  chores: { title: string; owner: 'me' | 'them'; done: number; neglected: number }[];
  /** Sealed verdicts, newest first. `winner` null on a tie; `points` winner first. */
  history: { id: string; end: string; winner: string | null; points: [number, number]; top: string | null }[];
  allTime: {
    wins: { me: number; them: number };
    ties: number;
    /** Two or more straight wins, up to the latest verdict. */
    streak: { who: 'me' | 'them'; weeks: number } | null;
    /** Each person's most-charged crime, all time. */
    worst: { me: string | null; them: string | null };
    quip: Quip;
  };
}

type Charge = { filerId: string; crime: string; status: ChargeStatus };
type Member = { id: string; name: string };

/** The crime most charged against `accusedBy` (charges filed by the other person), with counts, most first. */
function against(charges: readonly Charge[], filerId: string, book: CrimeBook) {
  const by = new Map<string, number>();
  for (const c of charges)
    if (c.filerId === filerId && counts(c.status)) by.set(c.crime, (by.get(c.crime) ?? 0) + 1);
  return [...by]
    .sort(([, a], [, b]) => b - a)
    .map(([crime, count]) => {
      const { title, sticker } = crimeInfo(book, crime);
      return { title, sticker, count };
    });
}

function side(person: Member, week: readonly Charge[], filerId: string, book: CrimeBook): BreakdownSide {
  const crimes = against(week, filerId, book);
  const total = crimes.reduce((n, c) => n + c.count, 0);
  const slid = week.filter((c) => c.filerId === filerId && c.status === 'dropped').length;
  const top = crimes[0];
  const quip: Quip =
    total === 0
      ? { name: person.name, text: 'kept it clean this week. Suspicious.' }
      : top && top.count >= 3
        ? { name: person.name, text: `has ${top.count} × ${top.title}. The fridge remembers.` }
        : { name: person.name, text: `has ${total} on the tab this week. Receipts kept.` };
  return { crimes, total, slid, quip };
}

/** The Breakdown screen's numbers and lines, pure. `verdicts` oldest first; snapshots as sealed. */
export function breakdown(input: {
  me: Member;
  them: Member;
  week: readonly Charge[];
  allCharges: readonly Charge[];
  chores: readonly { title: string; ownerId: string; done: number; neglected: number }[];
  verdicts: readonly {
    id: string;
    weekEnd: Date;
    winnerId: string | null;
    snapshot: { winner: { name: string; points: number }; loser: { points: number }; topCrimes: TopCrime[] };
  }[];
  book: CrimeBook;
}): BreakdownView {
  const { me, them, book } = input;
  const who = (id: string | null): 'me' | 'them' | null =>
    id === me.id ? 'me' : id === them.id ? 'them' : null;

  const wins = { me: 0, them: 0 };
  let ties = 0;
  for (const v of input.verdicts) {
    const w = who(v.winnerId);
    if (w) wins[w]++;
    else ties++;
  }
  let streak: BreakdownView['allTime']['streak'] = null;
  const latest = who(input.verdicts.at(-1)?.winnerId ?? null);
  if (latest) {
    let weeks = 0;
    for (let i = input.verdicts.length - 1; i >= 0 && who(input.verdicts[i]!.winnerId) === latest; i--)
      weeks++;
    if (weeks >= 2) streak = { who: latest, weeks };
  }
  const name = (w: 'me' | 'them'): string => (w === 'me' ? me.name : them.name);
  const leader = wins.me > wins.them ? 'me' : 'them';
  const quip: Quip = streak
    ? { name: name(streak.who), text: `is on a ${streak.weeks}-week streak. Someone call a referee.` }
    : input.verdicts.length === 0
      ? { text: 'No verdicts yet. The tension builds.' }
      : wins.me === wins.them
        ? { text: 'Dead even all-time. Suspiciously wholesome.' }
        : {
            name: name(leader),
            text: `leads ${Math.max(wins.me, wins.them)}–${Math.min(wins.me, wins.them)} all-time.`,
          };

  return {
    week: { me: side(me, input.week, them.id, book), them: side(them, input.week, me.id, book) },
    chores: input.chores.map((c) => ({
      title: c.title,
      owner: c.ownerId === me.id ? 'me' : 'them',
      done: c.done,
      neglected: c.neglected,
    })),
    history: [...input.verdicts].reverse().map((v) => {
      const t = v.snapshot.topCrimes[0];
      return {
        id: v.id,
        end: v.weekEnd.toISOString(),
        winner: v.winnerId ? v.snapshot.winner.name : null,
        points: [v.snapshot.winner.points, v.snapshot.loser.points],
        top: t ? (t.title ?? crimeInfo(book, t.crime).title) : null,
      };
    }),
    allTime: {
      wins,
      ties,
      streak,
      worst: {
        me: against(input.allCharges, them.id, book)[0]?.title ?? null,
        them: against(input.allCharges, me.id, book)[0]?.title ?? null,
      },
      quip,
    },
  };
}
