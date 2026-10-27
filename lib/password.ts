import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const key = (await scryptAsync(password, salt, 32)) as Buffer
  return `scrypt$${salt}$${key.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false
  const next = (await scryptAsync(password, salt, 32)) as Buffer
  const previous = Buffer.from(hash, "hex")
  if (next.length !== previous.length) return false
  return timingSafeEqual(next, previous)
}
