import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** 128 bits of randomness, URL-safe (session ids and invite tokens). */
export const newToken = (): string => randomBytes(16).toString('base64url');

/** What the database stores in place of a token. */
export const sha256 = (token: string): string => createHash('sha256').update(token).digest('hex');

function inviteKey(): Buffer {
  const key = Buffer.from(process.env.INVITE_KEY ?? '', 'base64');
  if (key.length !== 32) throw new Error('INVITE_KEY must be 32 bytes, base64 (see .env.example)');
  return key;
}

/** AES-256-GCM, stored as base64url of iv (12) + tag (16) + ciphertext. */
export function encrypt(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', inviteKey(), iv);
  const body = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function decrypt(stored: string): string {
  const raw = Buffer.from(stored, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', inviteKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

/** How long a signed file URL works (spec §11: short-lived). */
const FILE_URL_SECONDS = 300;

function filesKey(): Buffer {
  const key = Buffer.from(process.env.FILES_KEY ?? '', 'base64');
  if (key.length !== 32) throw new Error('FILES_KEY must be 32 bytes, base64 (see .env.example)');
  return key;
}

const fileSig = (key: string, exp: number): Buffer =>
  createHmac('sha256', filesKey()).update(`${key}\n${exp}`).digest();

/** A signed `/api/files/<key>` URL, valid for five minutes from `now`. */
export function signedFileUrl(key: string, now: Date): string {
  const exp = Math.floor(now.getTime() / 1000) + FILE_URL_SECONDS;
  return `/api/files/${key}?exp=${exp}&sig=${fileSig(key, exp).toString('base64url')}`;
}

export function verifyFile(key: string, exp: number, sig: string, now: Date): boolean {
  const given = Buffer.from(sig, 'base64url');
  const want = fileSig(key, exp);
  return given.length === want.length && timingSafeEqual(given, want) && now.getTime() < exp * 1000;
}
