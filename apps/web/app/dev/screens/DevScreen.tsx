'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Species } from '@petty-tab/art';
import { Intro } from '@/screens/Intro';
import { InviteSheet } from '@/screens/InviteSheet';
import { Picker } from '@/screens/Picker';
import { ALEX, INVITE_LINK, MAYA, type ScreenName } from './mocks';

/** Holds mock state for one screen; M2+ replace this with real data. */
export function DevScreen({ name, me }: { name: ScreenName; me?: string }): ReactNode {
  const router = useRouter();
  const go = (to: ScreenName): void => router.push(`/dev/screens/${to}`);
  const [myName, setMyName] = useState(me ?? MAYA.name);
  const [species, setSpecies] = useState<Species>(MAYA.species);
  const [inviteOpen, setInviteOpen] = useState(true);

  switch (name) {
    case 'intro':
      return <Intro onStart={() => go('picker')} />;
    case 'invite':
      return (
        <>
          <Intro onStart={() => setInviteOpen(true)} />
          <InviteSheet
            open={inviteOpen}
            link={INVITE_LINK}
            onClose={() => setInviteOpen(false)}
            onOpenTab={() => setInviteOpen(false)}
          />
        </>
      );
    case 'picker':
      // Joining Alex's tab: his bear is taken (spec §4.3), as in reference screens 03–05.
      return (
        <Picker
          name={myName}
          species={species}
          taken={ALEX}
          onName={setMyName}
          onSpecies={setSpecies}
          onContinue={() => go('invite')}
        />
      );
  }
}
