import type { ReactNode } from 'react';
import { Join } from './Join';

/** spec §4.2: the invite link, `/j/<token>`. */
export default async function Page({ params }: { params: Promise<{ token: string }> }): Promise<ReactNode> {
  return <Join token={(await params).token} />;
}
