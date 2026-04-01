import * as bcrypt from 'bcryptjs';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

/** Format a price in paise/cents to a rupee string, e.g. 29800 → "₹298.00" */
export function formatPrice(cents: number): string {
  return `₹${(cents / 100).toFixed(2)}`;
}
