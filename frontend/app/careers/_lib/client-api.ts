import { cache } from "react";

export type ClientInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
};

function publicApi(path: string) {
  const base = (
    process.env.OPENATS_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ""
  ).replace(/\/$/, "");
  if (!base) throw new Error("API base URL is not configured");
  return fetch(`${base}/public${path}`, { cache: "no-store" });
}

/** Null when the client can't be found */
export const getClientInfo = cache(async (slug: string): Promise<ClientInfo | null> => {
  try {
    const res = await publicApi(`/clients/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: ClientInfo | null };
    return body.data ?? null;
  } catch {
    return null;
  }
});
