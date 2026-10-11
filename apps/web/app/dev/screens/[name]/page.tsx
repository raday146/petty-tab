import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { DevScreen } from '../DevScreen';
import { SCREENS, type ScreenName } from '../mocks';

// Dev-only: every screen of design.md §6 on mock data. ?me=<name> swaps Maya's name (Hebrew name tests).
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<ReactNode> {
  if (process.env.NODE_ENV === 'production') notFound();
  const { name } = await params;
  if (!(SCREENS as readonly string[]).includes(name)) notFound();
  const query = await searchParams;
  return <DevScreen name={name as ScreenName} me={query.me} />;
}
