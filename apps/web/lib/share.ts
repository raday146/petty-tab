import type { RenderKind } from '@petty-tab/shared';

/**
 * A verdict's rendered card or reel as a File (spec §11). The share sheet only opens from a tap, so the file is
 * fetched before the tap, never after it.
 */
export async function fetchRender(verdictId: string, kind: RenderKind): Promise<File> {
  const res = await fetch(`/api/verdicts/${verdictId}/${kind}`);
  if (!res.ok) throw new Error(`${kind} is not rendered`);
  const type = kind === 'card' ? 'image/png' : 'video/mp4';
  return new File([await res.blob()], `petty-tab-verdict.${kind === 'card' ? 'png' : 'mp4'}`, { type });
}

/** The phone's share sheet with the file when it can take files; otherwise the file downloads. */
export function shareFile(file: File): void {
  if (navigator.canShare?.({ files: [file] })) {
    // Cancelling the sheet rejects with AbortError; nothing to do then.
    navigator.share({ files: [file] }).catch(() => undefined);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

/** "Send to WhatsApp" where files cannot be shared: WhatsApp's own link with the sentence as text. */
export function whatsAppText(text: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
