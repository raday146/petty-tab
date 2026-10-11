import type { Member } from '@/components/tab/Scoreboard';

// The prototype's household, so screens line up with reference/screens/.
export const MAYA: Member = { name: 'Maya', species: 'cat' };
export const ALEX: Member = { name: 'Alex', species: 'bear' };
export const INVITE_LINK = 'https://pettytab.app/j/k7Qm2xVf9TzR4wLp';

export const SCREENS = ['intro', 'invite', 'picker'] as const;
export type ScreenName = (typeof SCREENS)[number];
