'use client';

import { useEffect, type ReactNode } from 'react';
import { Notice } from '@/screens/Notice';

/**
 * Any client exception lands here instead of Next's dead "Application error" page. A reload refetches
 * everything, which is what recovers a bad state.
 * ponytail: the error text is shown on screen for the phone test (plan.md M7); remove it before launch.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }): ReactNode {
  useEffect(() => console.error(error), [error]);
  return (
    <Notice
      title="Something went wrong"
      lead={
        <>
          Reloading usually fixes it.
          <br />
          <small>
            {error.name}: {error.message}
            {error.digest && ` (${error.digest})`}
          </small>
        </>
      }
      action="Try again"
      onAction={() => location.reload()}
    />
  );
}
