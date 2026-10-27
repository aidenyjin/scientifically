type Env = Record<string, string | undefined>;

/**
 * The app's public origin, for URLs we hand to agents (guide, connector URL,
 * admin links). APP_URL wins; otherwise the (forwarded) Host of the request.
 */
export function publicOrigin(headers: Headers, env: Env = process.env): string {
  const configured = env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  const host = first(headers.get("x-forwarded-host")) ?? first(headers.get("host")) ?? "localhost:3000";
  const proto = first(headers.get("x-forwarded-proto")) ?? (isLocalHost(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/** True for addresses only this computer can reach (agents in the cloud can't call them). */
export function isLocalHost(hostOrOrigin: string): boolean {
  const host = hostOrOrigin.replace(/^[a-z]+:\/\//, "");
  return /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/.test(host);
}
