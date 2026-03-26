import crypto from 'crypto'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'dev-admin-secret-please-change-in-production'
export const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8時間

// ---- PIN ハッシュ ----

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt + ADMIN_SECRET, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const computed = crypto.scryptSync(pin, salt + ADMIN_SECRET, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'))
  } catch {
    return false
  }
}

// ---- セッショントークン ----

export function createSessionToken(adminId: string): string {
  const expires = (Date.now() + SESSION_TTL_MS).toString()
  const payload = `${adminId}|${expires}`
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

export function verifySessionToken(token: string): { adminId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const lastPipe = decoded.lastIndexOf('|')
    const payload = decoded.slice(0, lastPipe)
    const sig = decoded.slice(lastPipe + 1)
    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) return null
    const expires = parseInt(payload.split('|')[1] ?? '0')
    if (Date.now() > expires) return null
    return { adminId: payload.split('|')[0] }
  } catch {
    return null
  }
}
