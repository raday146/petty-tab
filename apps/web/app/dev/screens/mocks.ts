import type { Species } from '@petty-tab/art';
import type { Owed } from '@/components/tab/Scoreboard';
import type { TabCharge } from '@/screens/Tab';
import type { VerdictData } from '@/screens/Verdict';

export const SCREENS = [
  'intro',
  'invite',
  'picker',
  'tab',
  'plea',
  'appeal',
  'waiting',
  'verdict',
  'story',
] as const;
export type ScreenName = (typeof SCREENS)[number];

// The prototype's household, so screens line up with reference/screens/.
export const MAYA = { name: 'Maya', species: 'cat' as Species };
export const ALEX = { name: 'Alex', species: 'bear' as Species };
export const INVITE_LINK = 'https://pettytab.app/j/k7Qm2xVf9TzR4wLp';

/** Reference 06: the week so far, from Maya's phone. Scores are mock numbers, as in the prototype. */
export const WEEK: TabCharge[] = [
  { id: 'c1', crime: 'dish', status: 'guilty', filer: 'me' },
  { id: 'c2', crime: 'dj', status: 'guilty', filer: 'them' },
  { id: 'c3', crime: 'trash', status: 'guilty', filer: 'me' },
  { id: 'c4', crime: 'burrito', status: 'guilty', filer: 'me' },
  { id: 'c5', crime: 'sip', status: 'guilty', filer: 'me' },
];
export const SCORE: { lead: number; meOwed: Owed; themOwed: Owed } = {
  lead: 5,
  meOwed: [
    { unit: 'coffee', count: 4 },
    { unit: 'dish', count: 2 },
  ],
  themOwed: [{ unit: 'foot', count: 1 }],
};

/** Reference 08: Alex charged Maya with Snooze Roulette; Maya sees the plea card. */
export const PLEA_WEEK: TabCharge[] = [
  { id: 'c6', crime: 'clock', status: 'pending', filer: 'them' },
  ...WEEK,
];
export const PLEA_SCORE: typeof SCORE = {
  ...SCORE,
  lead: 6,
  meOwed: [
    { unit: 'coffee', count: 5 },
    { unit: 'dish', count: 2 },
  ],
};

/** Alex appealed the Blanket Burrito; Maya, who filed it, sees the appeal card. */
export const APPEAL_WEEK: TabCharge[] = WEEK.map((c) => (c.id === 'c4' ? { ...c, status: 'appealed' } : c));

/** Reference 12: Maya won the week. */
export const VERDICT: Omit<VerdictData, 'winner' | 'loser'> = {
  tie: false,
  topCrimes: [
    { crime: 'burrito', count: 2 },
    { crime: 'clock', count: 1 },
    { crime: 'dish', count: 1 },
  ],
  sentence: 'coffee7',
  locked: false,
  served: false,
  confirmed: false,
};
