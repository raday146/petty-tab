import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Render } from '../Render';

// Render-only pages for apps/renderer (spec §11): a pure function of the input handed to window.__render.
export default async function Page({ params }: { params: Promise<{ kind: string }> }): Promise<ReactNode> {
  const { kind } = await params;
  if (kind !== 'card' && kind !== 'reel') notFound();
  return <Render kind={kind} />;
}
