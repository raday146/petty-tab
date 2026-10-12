import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { resolve } from 'node:path';
import { Clock } from './clock.js';
import { verifyFile } from './crypto.js';
import { ApiError } from './errors.js';

/** Where renders live (spec §11): a local volume shared with apps/renderer. Relative to the app's directory. */
export const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? '../../storage');

const NAME = /^(card|reel)-[a-z0-9]+\.(png|mp4)$/;
const UUID = /^[0-9a-f-]{36}$/;

/**
 * Serves renders behind the signed URLs of `GET /verdicts/:id/card|reel`; the signature is the authorisation.
 * ponytail: local disk (a volume shared with the renderer on the one server); a bucket with presigned URLs if
 * the API ever runs on more than one machine.
 */
@Controller('files/verdicts/:id/:name')
export class FilesController {
  constructor(private readonly clock: Clock) {}

  @Get()
  get(
    @Param('id') id: string,
    @Param('name') name: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: { sendFile(path: string, options: { root: string; headers: Record<string, string> }): void },
  ): void {
    const key = `verdicts/${id}/${name}`;
    if (
      !UUID.test(id) ||
      !NAME.test(name) ||
      !verifyFile(key, Number(exp), String(sig ?? ''), this.clock.now())
    )
      throw new ApiError(403, 'not_allowed', 'That link has expired.');
    // sendFile answers Range requests, which iOS Safari needs to play an MP4.
    res.sendFile(key, { root: STORAGE_DIR, headers: { 'Cache-Control': 'private, max-age=300' } });
  }
}
