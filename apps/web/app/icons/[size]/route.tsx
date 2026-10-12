import { ImageResponse } from 'next/og';
import { createArt } from '@petty-tab/art';

// The app icon (design.md, prototype "App icon"): the coffee-cup crown the week's winner wears, on ink.
// Full bleed, crown inside the maskable safe zone, so one image serves "any" and "maskable".
const SIZES = [180, 192, 512];
const INK = '#1b2440'; // --ink; image routes cannot read CSS variables

export const dynamic = 'force-static';
export const generateStaticParams = (): { size: string }[] => SIZES.map((s) => ({ size: String(s) }));

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }): Promise<Response> {
  const size = Number((await params).size);
  if (!SIZES.includes(size)) return new Response(null, { status: 404 });
  // The image renderer ignores the art's <style>, so its two stroke classes become attributes.
  const stroke = `stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const svg = createArt({ idPrefix: 'icon' })
    .cupCrownSVG()
    .replace('<svg ', '<svg width="52" height="46" ')
    .replaceAll('class="o"', stroke)
    .replaceAll('class="t"', `fill="none" ${stroke}`);
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const crown = Math.round(size * 0.75);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: INK,
      }}
    >
      <img src={src} width={crown} height={Math.round((crown * 46) / 52)} alt="" />
    </div>,
    { width: size, height: size },
  );
}
