import { createHmac, timingSafeEqual } from 'node:crypto';
import { getVersionedJSON } from './storage.mjs';

const cookie = '__Host-luisdevgaming';
const sessionSeconds = 8 * 60 * 60;

export function configured(password) {
  return typeof password === 'string' && password.length >= 32;
}

function digest(password, value) {
  return createHmac('sha256', password).update(value).digest('hex');
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'ascii'), Buffer.from(b, 'ascii'));
}

export function authorized(request, password) {
  if (!configured(password)) return false;
  const token = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(cookie + '='))?.slice(cookie.length + 1);
  const match = token?.match(/^(\d{10,11})\.([0-9a-f]{64})$/);
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false;
  return equal(match[2], digest(password, 'session:' + match[1]));
}

export function sessionCookie(password) {
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const token = expires + '.' + digest(password, 'session:' + expires);
  return cookie + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + sessionSeconds;
}

export function clearCookie() {
  return cookie + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export async function checkPassword(store, ip, password, candidate) {
  const key = 'login/' + digest(password, 'rate:' + ip);
  for (let retry = 0; retry < 4; retry++) {
    const record = await getVersionedJSON(store, key);
    const now = Date.now();
    const openWindow = record?.data.until > now;
    const attempts = openWindow ? record.data.attempts : 0;
    if (attempts >= 10) return 'rate';
    if (typeof candidate === 'string' && candidate.length <= 512 &&
        equal(digest(password, 'password:' + candidate), digest(password, 'password:' + password))) {
      return 'ok';
    }
    const next = { attempts: attempts + 1, until: openWindow ? record.data.until : now + 15 * 60 * 1000 };
    const { modified } = await store.setJSON(key, next, record ? { onlyIfMatch: record.etag } : { onlyIfNew: true });
    if (modified) return 'invalid';
  }
  return 'rate';
}
