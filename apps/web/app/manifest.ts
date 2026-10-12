import type { MetadataRoute } from 'next';

/** The installable PWA (plan.md M6). Colours are the --linen and --ink tokens; a manifest needs literals. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Petty Tab',
    short_name: 'Petty Tab',
    description: 'Keep score of the little things. Settle up on Sunday.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3ead9',
    theme_color: '#f3ead9',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
