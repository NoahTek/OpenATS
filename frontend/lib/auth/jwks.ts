import { pool } from "./db";
import { symmetricDecrypt } from "better-auth/crypto";

/**
 * Checks whether stored JWKS keys in auth_jwks can be decrypted with the active
 * BETTER_AUTH_SECRET. If the secret changed (e.g. key rotation or environment mismatch),
 * deletes the stale keys so Better Auth can mint a fresh keypair on the next request
 * instead of throwing an unhandled decryption error.
 */
export async function ensureJwksIntegrity(): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return;

  try {
    const res = await pool.query<{ id: number; private_key: string }>(
      "select id, private_key from auth_jwks order by id desc limit 1",
    );
    if (res.rows.length === 0) return;

    const row = res.rows[0];
    try {
      const data = JSON.parse(row.private_key);
      await symmetricDecrypt({ key: secret, data });
    } catch {
      console.warn(
        "Stored JWKS key could not be decrypted with active BETTER_AUTH_SECRET. Cleaning up stale keys so fresh keys can be minted.",
      );
      await pool.query("delete from auth_jwks");
    }
  } catch {
    // Database or table may not exist yet during initial migration
  }
}
