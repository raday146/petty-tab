'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER, type Species } from '@petty-tab/art';
import type { InvitePreview, Me } from '@petty-tab/shared';
import { api, ApiFailure } from '@/lib/api';
import { Notice } from '@/screens/Notice';
import { Picker } from '@/screens/Picker';
import { AnimalSticker } from '@/components/AnimalSticker';
import { RulesSummary } from '@/components/RulesSummary';

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'paired'; me: Me }
  | { kind: 'join'; invite: InvitePreview };

/** spec §4.3 and the "Opens an invite link…" rows of the §4 table. Looking never consumes the link. */
export function Join({ token }: { token: string }): ReactNode {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>(ORDER[0]!);
  // spec §4: the rules come first; joining is accepting them.
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    // In order: /me first so a first visit gets one session, not two.
    void (async () => {
      const me = await api<Me>('/me');
      try {
        const invite = await api<InvitePreview>(`/invites/${encodeURIComponent(token)}`);
        if (invite.own) return router.replace('/');
        if (me.member) return setState({ kind: 'paired', me });
        setSpecies(ORDER.find((sp) => sp !== invite.inviter.species)!);
        setState({ kind: 'join', invite });
      } catch {
        setState(me.member ? { kind: 'paired', me } : { kind: 'invalid' });
      }
    })();
  }, [token, router]);

  const accept = async (): Promise<void> => {
    try {
      await api(`/invites/${encodeURIComponent(token)}/accept`, { body: { name, species } });
      router.push('/');
    } catch (e) {
      if (e instanceof ApiFailure && e.code === 'invite_invalid') setState({ kind: 'invalid' });
      if (e instanceof ApiFailure && e.code === 'already_in_pair') router.push('/');
    }
  };

  switch (state.kind) {
    case 'loading':
      return null;
    case 'invalid':
      return (
        <Notice
          title="This link has expired or was already used."
          lead="Ask for a new link, or start a tab of your own."
          action="Start a tab"
          onAction={() => router.push('/')}
        />
      );
    case 'paired': {
      const partner = state.me.pair?.partner;
      return (
        <Notice
          title={
            partner ? (
              <>
                You already have a tab with <bdi>{partner.name}</bdi>.
              </>
            ) : (
              'You already have a tab.'
            )
          }
          action="Open your tab"
          onAction={() => router.push('/')}
        />
      );
    }
    case 'join':
      if (!agreed) {
        return (
          <Notice
            face={<AnimalSticker species={state.invite.inviter.species} size={64} />}
            title={
              <>
                <bdi>{state.invite.inviter.name}</bdi>&rsquo;s rules
              </>
            }
            lead={<RulesSummary rules={state.invite.rules} side="joiner" />}
            action="Accept the rules & join"
            onAction={() => setAgreed(true)}
          />
        );
      }
      return (
        <Picker
          name={name}
          species={species}
          taken={state.invite.inviter}
          invitedBy={state.invite.inviter}
          onName={setName}
          onSpecies={setSpecies}
          onContinue={accept}
        />
      );
  }
}
