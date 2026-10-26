import { describe, expect, it } from "vitest";
import { GAME } from "./config";
import {
  effectiveStrength,
  isDue,
  mistakesReview,
  pickPractice,
  rankSkills,
  updateSkill,
  updateSkillsForOutcomes,
  type PracticeCandidate,
  type SkillState,
} from "./srs";

const DAY = 86_400_000;
const T0 = new Date("2026-10-26T12:00:00Z");
const days = (n: number) => new Date(T0.getTime() + n * DAY);
const skill = (
  strength: number,
  intervalDays: number,
  lastSeenDaysAgo: number,
  now = T0,
): SkillState => {
  const lastSeenAt = new Date(now.getTime() - lastSeenDaysAgo * DAY);
  return {
    strength,
    intervalDays,
    lastSeenAt,
    dueAt: new Date(lastSeenAt.getTime() + intervalDays * DAY),
  };
};

describe("updateSkill", () => {
  it("schedules a new skill", () => {
    expect(updateSkill(null, true, T0)).toEqual({
      strength: GAME.srs.correctGain,
      intervalDays: 1,
      lastSeenAt: T0,
      dueAt: days(1),
    });
    expect(updateSkill(null, false, T0)).toEqual({
      strength: 0,
      intervalDays: 0.5,
      lastSeenAt: T0,
      dueAt: days(0.5),
    });
  });

  it("grows the interval ×2.2 on an on-time correct answer", () => {
    const s = skill(0.5, 2, 2); // due right now
    const next = updateSkill(s, true, T0);
    expect(next.intervalDays).toBeCloseTo(4.4);
    expect(next.strength).toBeCloseTo(0.5 + 0.5 * GAME.srs.correctGain);
    expect(next.dueAt.getTime()).toBe(T0.getTime() + 4.4 * DAY);
    expect(next.lastSeenAt).toEqual(T0);
  });

  it("treats a late review like an on-time one", () => {
    expect(updateSkill(skill(0.5, 2, 9), true, T0).intervalDays).toBeCloseTo(4.4);
  });

  it("barely moves on an immediate re-review (no cramming)", () => {
    const s = skill(0.5, 2, 0);
    const next = updateSkill(s, true, T0);
    expect(next.intervalDays).toBe(2);
    expect(next.strength).toBeGreaterThan(0.5);
    expect(next.strength).toBeLessThan(updateSkill(skill(0.5, 2, 2), true, T0).strength);
  });

  it("gives partial growth halfway to the due date", () => {
    expect(updateSkill(skill(0.5, 2, 1), true, T0).intervalDays).toBeCloseTo(2 * (1 + 1.2 * 0.5));
  });

  it("resets the interval and drops strength on a wrong answer", () => {
    const next = updateSkill(skill(0.8, 20, 20), false, T0);
    expect(next.intervalDays).toBe(GAME.srs.wrongIntervalDays);
    expect(next.strength).toBeCloseTo(0.4);
    expect(next.dueAt).toEqual(days(0.5));
  });

  it("caps the interval and keeps strength in 0–1", () => {
    let s: SkillState | null = null;
    let now = T0;
    for (let i = 0; i < 30; i++) {
      s = updateSkill(s, true, now);
      now = s.dueAt;
    }
    expect(s?.intervalDays).toBe(GAME.srs.maxIntervalDays);
    expect(s?.strength).toBeLessThanOrEqual(1);
    expect(s?.strength).toBeGreaterThan(0.99);
  });

  it("follows 1 → 2.2 → 4.84 days when reviewed on time", () => {
    let s = updateSkill(null, true, T0);
    expect(s.intervalDays).toBe(1);
    s = updateSkill(s, true, s.dueAt);
    expect(s.intervalDays).toBeCloseTo(2.2);
    s = updateSkill(s, true, s.dueAt);
    expect(s.intervalDays).toBeCloseTo(4.84);
  });
});

describe("effectiveStrength", () => {
  it("holds until due, then halves every max(interval, 2) days", () => {
    const s = skill(0.8, 4, 0); // due in 4 days
    expect(effectiveStrength(s, T0)).toBe(0.8);
    expect(effectiveStrength(s, days(4))).toBe(0.8);
    expect(effectiveStrength(s, days(8))).toBeCloseTo(0.4);
    expect(effectiveStrength(s, days(12))).toBeCloseTo(0.2);
    const short = skill(0.8, 0.5, 0);
    expect(effectiveStrength(short, days(0.5 + GAME.srs.minHalfLifeDays))).toBeCloseTo(0.4);
  });

  it("is due at and after dueAt", () => {
    const s = skill(0.5, 1, 0);
    expect(isDue(s, T0)).toBe(false);
    expect(isDue(s, days(1))).toBe(true);
  });
});

describe("updateSkillsForOutcomes", () => {
  it("updates each tag once per outcome and returns only changed tags", () => {
    const skills = { a: skill(0.5, 2, 2), untouched: skill(0.3, 1, 0) };
    const out = updateSkillsForOutcomes(
      skills,
      [
        { skillTags: ["a", "b"], correctFirstTry: true },
        { skillTags: ["a"], correctFirstTry: true },
        { skillTags: ["c", "c"], correctFirstTry: false },
      ],
      T0,
    );
    expect(Object.keys(out).sort()).toEqual(["a", "b", "c"]);
    // second correct answer in the same lesson doesn't grow the interval again
    expect(out.a.intervalDays).toBeCloseTo(4.4);
    expect(out.b).toMatchObject({ intervalDays: 1 });
    expect(out.c).toMatchObject({ intervalDays: 0.5, strength: 0 });
  });
});

describe("rankSkills", () => {
  it("orders weakest first", () => {
    const ranked = rankSkills(
      { strong: skill(0.9, 5, 1), weak: skill(0.2, 1, 0), overdue: skill(0.9, 2, 4) },
      T0,
    );
    expect(ranked.map((r) => r.tag)).toEqual(["weak", "overdue", "strong"]);
    expect(ranked[1].due).toBe(true);
  });
});

describe("pickPractice", () => {
  const skills: Record<string, SkillState> = {
    weak: skill(0.1, 1, 0), // not due, very weak
    due: skill(0.6, 2, 3), // overdue
    strong: skill(0.95, 30, 1), // fresh, strong
  };
  const candidates: PracticeCandidate[] = [
    { exerciseId: "s1", skillTags: ["strong"] },
    { exerciseId: "s2", skillTags: ["strong"] },
    { exerciseId: "w1", skillTags: ["weak"] },
    { exerciseId: "w2", skillTags: ["weak"] },
    { exerciseId: "d1", skillTags: ["due"] },
    { exerciseId: "d2", skillTags: ["due"] },
  ];

  it("prioritises due and weak skills over strong ones", () => {
    const picked = pickPractice(candidates, skills, T0, 4, 1);
    expect(picked).toHaveLength(4);
    // overdue skill first, then the weak one, alternating as each pick halves a skill's pull
    expect(picked.map((id) => id[0])).toEqual(["d", "w", "d", "w"]);
  });

  it("puts the strong skill last", () => {
    const picked = pickPractice(candidates, skills, T0, 10, 1);
    expect(picked).toHaveLength(6);
    expect(new Set(picked.slice(4))).toEqual(new Set(["s1", "s2"]));
  });

  it("spreads picks across skills instead of draining one", () => {
    const many: PracticeCandidate[] = [
      ...Array.from({ length: 8 }, (_, i) => ({ exerciseId: `weak-${i}`, skillTags: ["weak"] })),
      { exerciseId: "due-0", skillTags: ["due"] },
      { exerciseId: "due-1", skillTags: ["due"] },
    ];
    const first4 = pickPractice(many, skills, T0, 4, 7);
    expect(first4.filter((id) => id.startsWith("due"))).toHaveLength(2);
  });

  it("lifts recent mistakes among equally-needed skills, ignoring old ones", () => {
    const pool: PracticeCandidate[] = [
      { exerciseId: "a", skillTags: ["strong"] },
      { exerciseId: "b", skillTags: ["strong"], lastWrongAt: new Date(T0.getTime() - DAY) },
      { exerciseId: "c", skillTags: ["strong"], lastWrongAt: new Date(T0.getTime() - 60 * DAY) },
    ];
    for (let seed = 0; seed < 20; seed++)
      expect(pickPractice(pool, skills, T0, 1, seed)).toEqual(["b"]);
  });

  it("is deterministic, has no duplicates, and the seed varies ties", () => {
    const tied: PracticeCandidate[] = Array.from({ length: 12 }, (_, i) => ({
      exerciseId: `x${i}`,
      skillTags: [],
    }));
    const a = pickPractice([...tied, ...tied], {}, T0, 12, 3);
    expect(a).toEqual(pickPractice([...tied, ...tied], {}, T0, 12, 3));
    expect(new Set(a).size).toBe(12);
    const orders = new Set(
      Array.from({ length: 6 }, (_, s) => pickPractice(tied, {}, T0, 12, s).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("merges duplicate candidates (union of tags, latest mistake)", () => {
    const picked = pickPractice(
      [
        { exerciseId: "e", skillTags: ["strong"] },
        { exerciseId: "e", skillTags: ["due"] },
        { exerciseId: "f", skillTags: ["strong"] },
      ],
      skills,
      T0,
      5,
    );
    expect(picked).toEqual(["e", "f"]);
  });

  it("treats unseen skills as moderately weak", () => {
    const picked = pickPractice(
      [
        { exerciseId: "known-strong", skillTags: ["strong"] },
        { exerciseId: "unseen", skillTags: ["brand-new"] },
        { exerciseId: "overdue", skillTags: ["due"] },
      ],
      skills,
      T0,
      3,
    );
    expect(picked).toEqual(["overdue", "unseen", "known-strong"]);
  });

  it("handles empty input and size 0", () => {
    expect(pickPractice([], skills, T0, 10, 0)).toEqual([]);
    expect(pickPractice(candidates, skills, T0, 0, 0)).toEqual([]);
  });
});

describe("mistakesReview", () => {
  const at = (h: number) => new Date(T0.getTime() + h * 3_600_000);

  it("returns the most recent wrong exercises first, deduped", () => {
    const attempts = [
      { exerciseId: "a", correct: false, at: at(1) },
      { exerciseId: "b", correct: false, at: at(2) },
      { exerciseId: "a", correct: false, at: at(5) },
      { exerciseId: "c", correct: true, at: at(6) },
      { exerciseId: "d", correct: false, at: at(3) },
    ];
    expect(mistakesReview(attempts, 10)).toEqual(["a", "d", "b"]);
    expect(mistakesReview(attempts, 2)).toEqual(["a", "d"]);
  });

  it("drops mistakes fixed by a later correct answer unless asked to keep them", () => {
    const attempts = [
      { exerciseId: "a", correct: false, at: at(1) },
      { exerciseId: "a", correct: true, at: at(2) },
      { exerciseId: "b", correct: true, at: at(1) },
      { exerciseId: "b", correct: false, at: at(2) },
    ];
    expect(mistakesReview(attempts, 10)).toEqual(["b"]);
    expect(mistakesReview(attempts, 10, { includeFixed: true })).toEqual(["b", "a"]);
  });

  it("does not depend on input order", () => {
    const attempts = [
      { exerciseId: "x", correct: false, at: at(4) },
      { exerciseId: "y", correct: false, at: at(9) },
      { exerciseId: "z", correct: false, at: at(1) },
    ];
    expect(mistakesReview([...attempts].reverse(), 10)).toEqual(["y", "x", "z"]);
    expect(mistakesReview([], 10)).toEqual([]);
  });
});
