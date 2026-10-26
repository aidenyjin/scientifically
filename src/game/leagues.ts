import { hashString, randInt, rng, shuffle } from "@/lib/rng";
import { GAME } from "./config";

/**
 * Weekly leagues. Weeks are ISO weeks in UTC: Monday 00:00 UTC → next Monday
 * 00:00 UTC. Groups are topped up to `groupSize` with deterministic bots
 * seeded by week + group, whose XP grows in bursts through the week.
 */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const TIERS = GAME.leagues.tiers;
export const TOP_TIER = TIERS.length - 1;

export function tierName(tier: number): string {
  return TIERS[clampTier(tier)];
}

export function clampTier(tier: number): number {
  return Math.min(TOP_TIER, Math.max(0, Math.floor(tier)));
}

// ── Weeks ────────────────────────────────────────────────────────────────

/** ISO week id of the UTC date of `now`, e.g. "2026-W44". */
export function weekIdFor(now: Date): string {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // Monday = 0
  const thursday = day + (3 - weekday) * DAY; // the ISO year is the year of the week's Thursday
  const year = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / WEEK) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export interface WeekBounds {
  /** Monday 00:00 UTC (inclusive). */
  start: Date;
  /** Next Monday 00:00 UTC (exclusive). */
  end: Date;
}

export function weekBounds(weekId: string): WeekBounds {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) throw new Error(`Invalid week id: ${weekId}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > isoWeeksInYear(year)) throw new Error(`Invalid week id: ${weekId}`);
  const jan4 = Date.UTC(year, 0, 4); // always in week 1
  const week1Monday = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY;
  const start = week1Monday + (week - 1) * WEEK;
  return { start: new Date(start), end: new Date(start + WEEK) };
}

/** 52 or 53. */
export function isoWeeksInYear(year: number): number {
  // Dec 28 is always in the last ISO week of its year.
  return Number(weekIdFor(new Date(Date.UTC(year, 11, 28))).slice(6));
}

/** The week `n` weeks after (negative: before) `weekId`. */
export function shiftWeek(weekId: string, n: number): string {
  return weekIdFor(new Date(weekBounds(weekId).start.getTime() + n * WEEK));
}

/** Milliseconds until the current week ends (next Monday 00:00 UTC). */
export function timeLeft(now: Date): number {
  return weekBounds(weekIdFor(now)).end.getTime() - now.getTime();
}

// ── Groups ───────────────────────────────────────────────────────────────

/**
 * Real users of the same week and tier land in one of `buckets` groups
 * (default 1, so everyone in a tier shares a league until there are lots of users).
 */
export function groupIdFor(
  weekId: string,
  tier: number,
  userId: string,
  buckets: number = GAME.leagues.groupBuckets,
): string {
  const n = Math.max(1, Math.floor(buckets));
  const bucket = n === 1 ? 0 : hashString(`${weekId}:${userId}`) % n;
  return `${weekId}:t${clampTier(tier)}:g${bucket}`;
}

// ── Bots ─────────────────────────────────────────────────────────────────

// prettier-ignore
const BOT_HANDLES = [
  "QuarkQueen", "MitoMike", "ProtonPia", "NeutronNed", "IonIvy", "HelixHank", "AtomAva", "PhotonPhil",
  "CarbonCarl", "OrbitOlive", "GeneGina", "BoronBen", "LaserLaila", "PlasmaPete", "EnzymeElla", "FossilFinn",
  "CometCleo", "MagmaMax", "GluonGus", "ZygoteZoe", "VectorVic", "PulsarPaz", "RiboRita", "KelvinKai",
  "TeslaTess", "OhmOtto", "DopplerDot", "FluxFelix", "QuasarQuinn", "BaryonBea", "LeptonLeo", "MuonMia",
  "IsotopeIsa", "PrismPriya", "CraterCruz", "SporeSam", "AlgaeAl", "AmoebaAmy", "CortexCora", "NeuronNell",
  "SynapseSy", "GravityGrace", "BosonBo", "ThetaTheo", "SigmaSid", "DeltaDee", "CellCelia", "XylemXan",
  "PhloemPhoebe", "StrataStan", "BasaltBella", "QuartzQuentin", "OzoneOz", "MeteorMo", "TundraTia", "TidalTom",
  "ChloroChloe", "ElectroEd", "MolarMolly", "BunsenBurt", "PetriPat", "CatalystCat", "ReactorRay", "SolarSol",
  "LunarLuna", "TitanTina",
] as const;

// prettier-ignore
const BOT_COLORS = [
  "#58cc02", "#1cb0f6", "#ff9600", "#ce82ff", "#ff4b4b", "#ffc800", "#2bdcc6", "#ff86d0", "#7c6cff", "#a5734d",
] as const;

export interface LeagueBot {
  id: string;
  name: string;
  color: string;
  isBot: true;
  /** XP at the end of the week. */
  weeklyTotal: number;
  /** XP earned in the week up to `now` (0 before the week, `weeklyTotal` after it). */
  xpAt(now: Date): number;
}

interface Session {
  at: number;
  xp: number;
}

/** Deterministic bots for a group: `count` of them, seeded by week + group, keener in higher tiers. */
export function botsFor(weekId: string, groupId: string, tier: number, count: number): LeagueBot[] {
  const n = Math.max(0, Math.floor(count));
  const seed = hashString(`bots:${weekId}:${groupId}`);
  const { start } = weekBounds(weekId);
  const handles = shuffle(BOT_HANDLES, seed);
  const pick = rng(seed ^ 0x9e3779b9);
  return Array.from({ length: n }, (_, i) => {
    const base = handles[i % handles.length];
    const lap = Math.floor(i / handles.length);
    // Some handles get a number, like real usernames; later laps always do (keeps names unique).
    const name =
      lap > 0 ? `${base}${lap + 1}` : pick() < 0.3 ? `${base}${randInt(pick, 10, 99)}` : base;
    const sessions = botSessions(
      hashString(`bot:${weekId}:${groupId}:${i}`),
      clampTier(tier),
      start.getTime(),
    );
    const weeklyTotal = sessions.reduce((a, s) => a + s.xp, 0);
    return {
      id: `bot:${groupId}:${i}`,
      name,
      color: BOT_COLORS[(seed + i) % BOT_COLORS.length],
      isBot: true as const,
      weeklyTotal,
      xpAt(now: Date) {
        const t = now.getTime();
        let xp = 0;
        for (const s of sessions) {
          if (s.at > t) break;
          xp += s.xp;
        }
        return xp;
      },
    };
  });
}

function botSessions(seed: number, tier: number, weekStart: number): Session[] {
  const cfg = GAME.leagues.bots;
  const next = rng(seed);
  const boost = Math.sqrt(1 + cfg.tierGrowth * tier);
  const keen = Math.pow(next(), cfg.keenSkew);
  const count = Math.round((cfg.minSessions + keen * (cfg.maxSessions - cfg.minSessions)) * boost);
  // < 1 → plays early in the week, > 1 → crams at the end, ~1 → steady.
  const lean = Math.pow(2, 1 - 2 * next());
  const sessions: Session[] = [];
  for (let i = 0; i < count; i++) {
    const day = Math.min(6, Math.floor(7 * Math.pow(next(), lean)));
    const minuteOfDay = randInt(next, 7 * 60, 23 * 60 - 1); // awake hours, UTC
    let lessons = 1 + Math.floor(next() * cfg.maxLessonsPerSession * boost);
    if (next() < cfg.bingeChance) lessons *= 3;
    let xp = 0;
    for (let l = 0; l < lessons; l++) xp += randInt(next, cfg.lessonXpMin, cfg.lessonXpMax);
    sessions.push({ at: weekStart + day * DAY + minuteOfDay * MINUTE, xp });
  }
  return sessions.sort((a, b) => a.at - b.at);
}

// ── Standings & zones ───────────────────────────────────────────────────

export type StandingInput = { id: string } & ({ xp: number } | { xpAt: (now: Date) => number });

export type Standing<T extends StandingInput> = T & { xp: number; rank: number };

function entryXp(entry: StandingInput, now: Date): number {
  return "xpAt" in entry ? entry.xpAt(now) : entry.xp;
}

/**
 * Sort by XP (highest first) as of `now`. Ties keep their input order, so put
 * real users before bots to let a user win ties. Ranks are 1..n, unique.
 */
export function standings<T extends StandingInput>(
  entries: readonly T[],
  now: Date,
): Standing<T>[] {
  return entries
    .map((entry, index) => ({ entry, index, xp: entryXp(entry, now) }))
    .sort((a, b) => b.xp - a.xp || a.index - b.index)
    .map(({ entry, xp }, i) => ({ ...entry, xp, rank: i + 1 }));
}

export type Zone = "promote" | "demote" | "stay";

/** How many ranks promote / demote in a group of `groupSize` (scaled down for small groups). */
export function zoneSizes(groupSize: number): { promote: number; demote: number } {
  const { promote, demote, groupSize: full } = GAME.leagues;
  const size = Math.max(0, Math.floor(groupSize));
  if (size >= full) return { promote, demote };
  const scale = size / full;
  const p = size === 0 ? 0 : Math.max(1, Math.round(promote * scale));
  const d = Math.min(Math.round(demote * scale), Math.max(0, size - p));
  return { promote: p, demote: d };
}

/** 1-based `rank`. No promotion from the top tier, no demotion from the bottom. */
export function zoneFor(rank: number, groupSize: number, tier: number): Zone {
  if (rank < 1 || rank > groupSize) return "stay";
  const t = clampTier(tier);
  const { promote, demote } = zoneSizes(groupSize);
  if (rank <= promote) return t < TOP_TIER ? "promote" : "stay";
  if (rank > groupSize - demote) return t > 0 ? "demote" : "stay";
  return "stay";
}

/** Tier for next week given this week's final rank. */
export function resolveWeek(rank: number, groupSize: number, tier: number): number {
  const zone = zoneFor(rank, groupSize, tier);
  const t = clampTier(tier);
  return zone === "promote" ? t + 1 : zone === "demote" ? t - 1 : t;
}

/** Value for LeagueMembership.outcome. */
export function weekOutcome(
  rank: number,
  groupSize: number,
  tier: number,
): "promoted" | "demoted" | "stayed" {
  const zone = zoneFor(rank, groupSize, tier);
  return zone === "promote" ? "promoted" : zone === "demote" ? "demoted" : "stayed";
}

export interface LeagueMember {
  id: string;
  name: string;
  xp: number;
}

export type LeagueRow = Standing<(LeagueMember & { isBot: false; color?: string }) | LeagueBot> & {
  zone: Zone;
};

/**
 * Full table for a group: real members plus bots topping it up to `groupSize`,
 * ranked as of `now`, each with its zone. Members win ties against bots.
 */
export function leagueTable(
  input: { weekId: string; groupId: string; tier: number; members: readonly LeagueMember[] },
  now: Date,
): LeagueRow[] {
  const size = Math.max(GAME.leagues.groupSize, input.members.length);
  const bots = botsFor(input.weekId, input.groupId, input.tier, size - input.members.length);
  const entries = [...input.members.map((m) => ({ ...m, isBot: false as const })), ...bots];
  return standings(entries, now).map((row) => ({
    ...row,
    zone: zoneFor(row.rank, size, input.tier),
  }));
}
