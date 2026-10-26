import { describe, expect, it } from "vitest";
import { evaluateExpression as ev, ExprError, tokenize, tryEvaluate } from "./expr";

describe("numeric expression evaluator", () => {
  it("evaluates numbers in every accepted form", () => {
    expect(ev("42")).toBe(42);
    expect(ev("0.5")).toBe(0.5);
    expect(ev(".5")).toBe(0.5);
    expect(ev("5.")).toBe(5);
    expect(ev("1e-3")).toBe(0.001);
    expect(ev("6.02E23")).toBe(6.02e23);
    expect(ev("3e+8")).toBe(3e8);
  });

  it("follows operator precedence and associativity", () => {
    expect(ev("1 + 2 * 3")).toBe(7);
    expect(ev("(1 + 2) * 3")).toBe(9);
    expect(ev("10 - 4 - 3")).toBe(3);
    expect(ev("24 / 4 / 2")).toBe(3);
    expect(ev("2 ^ 3 ^ 2")).toBe(512);
    expect(ev("2 * 3 ^ 2")).toBe(18);
    expect(ev("((2))")).toBe(2);
  });

  it("handles unary minus and plus", () => {
    expect(ev("-3")).toBe(-3);
    expect(ev("--3")).toBe(3);
    expect(ev("+3")).toBe(3);
    expect(ev("-2 ^ 2")).toBe(-4);
    expect(ev("(-2) ^ 2")).toBe(4);
    expect(ev("2 ^ -1")).toBe(0.5);
    expect(ev("4 * -2")).toBe(-8);
    expect(ev("5 - -2")).toBe(7);
  });

  it("substitutes vars, which shadow constants", () => {
    expect(ev("m * a", { m: 1200, a: 2.5 })).toBe(3000);
    expect(ev("0.5 * m * v ^ 2", { m: 2, v: 3 })).toBe(9);
    expect(ev("q_1 * q2", { q_1: 2, q2: 4 })).toBe(8);
    expect(ev("e")).toBeCloseTo(Math.E);
    expect(ev("e * 2", { e: 1.6e-19 })).toBeCloseTo(3.2e-19);
  });

  it("knows pi, e and the allowed functions", () => {
    expect(ev("pi")).toBeCloseTo(Math.PI);
    expect(ev("sqrt(16)")).toBe(4);
    expect(ev("abs(-7.5)")).toBe(7.5);
    expect(ev("sin(pi / 2)")).toBeCloseTo(1);
    expect(ev("cos(0)")).toBe(1);
    expect(ev("tan(pi / 4)")).toBeCloseTo(1);
    expect(ev("log10(1000)")).toBeCloseTo(3);
    expect(ev("ln(e ^ 2)")).toBeCloseTo(2);
    expect(ev("exp(0)")).toBe(1);
    expect(ev("min(3, 1, 2)")).toBe(1);
    expect(ev("max(3, 1, 2)")).toBe(3);
    expect(ev("max(4)")).toBe(4);
    expect(ev("2 * pi * sqrt(L / g)", { L: 1, g: 9.8 })).toBeCloseTo(2.0071, 4);
    expect(ev("sqrt(2 * g * h)", { g: 9.8, h: 5 })).toBeCloseTo(9.899, 3);
  });

  it("ignores whitespace", () => {
    expect(ev("  1+2  *\t3 ")).toBe(7);
  });

  it.each([
    ["", /empty/],
    ["   ", /empty/],
    ["2 ** 3", /use \^/],
    ["2pi", /missing operator/],
    ["2 (3)", /missing operator/],
    ["(1)(2)", /missing operator/],
    ["pi e", /missing operator/],
    ["1 +", /expected a number/],
    ["* 2", /expected a number/],
    ["(1 + 2", /expected "\)"/],
    ["1 + 2)", /unexpected/],
    ["1,2", /unexpected/],
    ["x + 1", /unknown variable "x"/],
    ["log(10)", /unknown function "log" — use ln or log10/],
    ["foo(1)", /unknown function "foo"/],
    ["sqrt", /is a function/],
    ["sqrt()", /takes 1 argument, got 0/],
    ["sqrt(1, 2)", /takes 1 argument, got 2/],
    ["max()", /at least 1 argument/],
    ["1 / 0", /not a finite number/],
    ["sqrt(-1)", /not a finite number/],
    ["10 ^ 400", /not a finite number/],
    ["2 % 3", /unexpected character "%"/],
    ["a = 3", /unexpected character "="/],
    ["2 × 3", /unexpected character "×"/],
    ["constructor", /unknown variable/],
    ["toString(1)", /unknown function/],
    ["__proto__", /unknown variable/],
  ])("rejects %j", (expr, message) => {
    expect(() => ev(expr)).toThrow(ExprError);
    expect(() => ev(expr)).toThrow(message);
  });

  it("rejects non-finite vars", () => {
    expect(() => ev("x", { x: NaN })).toThrow(/not a finite number/);
  });

  it("guards against pathological input", () => {
    expect(() => ev("1+".repeat(300) + "1")).toThrow(/longer than/);
    expect(() => ev("(".repeat(100) + "1" + ")".repeat(100))).toThrow(/nested too deeply/);
    expect(() => ev("-".repeat(100) + "1")).toThrow(/nested too deeply/);
    expect(ev("(".repeat(30) + "1" + ")".repeat(30))).toBe(1);
  });

  it("tokenizes with positions", () => {
    expect(tokenize("2*x").map((t) => t.kind)).toEqual(["num", "op", "id", "end"]);
    expect(tokenize("1e-3")[0]).toEqual({ kind: "num", value: 0.001, pos: 0 });
  });

  it("tryEvaluate reports errors instead of throwing", () => {
    expect(tryEvaluate("m * a", { m: 2, a: 3 })).toEqual({ ok: true, value: 6 });
    expect(tryEvaluate("m * b", { m: 2 })).toEqual({ ok: false, error: 'unknown variable "b"' });
  });
});
