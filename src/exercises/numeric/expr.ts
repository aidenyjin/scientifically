/**
 * A tiny, safe arithmetic evaluator for `numeric.computation.expr`.
 *
 * Deliberately not mathjs: this runs in autoCheck, which is part of the
 * registry that the client bundle also imports. Supported syntax:
 *   numbers      2, 0.5, .5, 1e-3, 6.02E23
 *   operators    + - * / ^ (power, right-associative), unary minus/plus, ( )
 *   identifiers  names from `vars` (these shadow the constants), pi, e
 *   functions    sqrt abs sin cos tan (radians) log10 ln exp min max
 * Anything else (implicit multiplication, `**`, unknown names, …) is an error.
 */

export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprError";
  }
}

type Token =
  | { kind: "num"; value: number; pos: number }
  | { kind: "id"; name: string; pos: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "^"; pos: number }
  | { kind: "lparen" | "rparen" | "comma" | "end"; pos: number };

const MAX_LENGTH = 500;
const MAX_DEPTH = 64;

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS: Record<string, { arity: number | "variadic"; fn: (...args: number[]) => number }> =
  {
    sqrt: { arity: 1, fn: Math.sqrt },
    abs: { arity: 1, fn: Math.abs },
    sin: { arity: 1, fn: Math.sin },
    cos: { arity: 1, fn: Math.cos },
    tan: { arity: 1, fn: Math.tan },
    log10: { arity: 1, fn: Math.log10 },
    ln: { arity: 1, fn: Math.log },
    exp: { arity: 1, fn: Math.exp },
    min: { arity: "variadic", fn: Math.min },
    max: { arity: "variadic", fn: Math.max },
  };

const NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*/;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const rest = input.slice(i);
    const num = NUMBER.exec(rest);
    if (num) {
      tokens.push({ kind: "num", value: Number(num[0]), pos: i });
      i += num[0].length;
      continue;
    }
    const id = IDENT.exec(rest);
    if (id) {
      tokens.push({ kind: "id", name: id[0], pos: i });
      i += id[0].length;
      continue;
    }
    if (ch === "*" && input[i + 1] === "*")
      throw new ExprError(`use ^ for powers, not ** (at ${i})`);
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ kind: "op", op: ch, pos: i });
    } else if (ch === "(") tokens.push({ kind: "lparen", pos: i });
    else if (ch === ")") tokens.push({ kind: "rparen", pos: i });
    else if (ch === ",") tokens.push({ kind: "comma", pos: i });
    else throw new ExprError(`unexpected character "${ch}" at ${i}`);
    i++;
  }
  tokens.push({ kind: "end", pos: input.length });
  return tokens;
}

/** Evaluate `expr` with `vars`. Throws ExprError on bad syntax or a non-finite result. */
export function evaluateExpression(expr: string, vars: Record<string, number> = {}): number {
  if (expr.length > MAX_LENGTH)
    throw new ExprError(`expression is longer than ${MAX_LENGTH} characters`);
  const tokens = tokenize(expr);
  let pos = 0;
  let depth = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const describe = (t: Token) =>
    t.kind === "end" ? "end of expression" : `"${expr.slice(t.pos, t.pos + 12)}" at ${t.pos}`;

  const enter = () => {
    if (++depth > MAX_DEPTH) throw new ExprError("expression is nested too deeply");
  };

  // additive := multiplicative (("+" | "-") multiplicative)*
  function additive(): number {
    let left = multiplicative();
    for (let t = peek(); t.kind === "op" && (t.op === "+" || t.op === "-"); t = peek()) {
      next();
      const right = multiplicative();
      left = t.op === "+" ? left + right : left - right;
    }
    return left;
  }

  // multiplicative := unary (("*" | "/") unary)*
  function multiplicative(): number {
    let left = unary();
    for (let t = peek(); t.kind === "op" && (t.op === "*" || t.op === "/"); t = peek()) {
      next();
      const right = unary();
      left = t.op === "*" ? left * right : left / right;
    }
    return left;
  }

  // unary := ("-" | "+") unary | power      (so -2^2 = -4, as in maths)
  function unary(): number {
    const t = peek();
    if (t.kind === "op" && (t.op === "-" || t.op === "+")) {
      next();
      enter();
      const value = unary();
      depth--;
      return t.op === "-" ? -value : value;
    }
    return power();
  }

  // power := primary ("^" unary)?           (right-associative: 2^3^2 = 2^9)
  function power(): number {
    const base = primary();
    const t = peek();
    if (t.kind === "op" && t.op === "^") {
      next();
      enter();
      const exponent = unary();
      depth--;
      return base ** exponent;
    }
    return base;
  }

  function primary(): number {
    const t = next();
    let value: number;
    if (t.kind === "num") {
      value = t.value;
    } else if (t.kind === "lparen") {
      enter();
      value = additive();
      depth--;
      expect("rparen", ")");
    } else if (t.kind === "id") {
      value = peek().kind === "lparen" ? call(t.name) : lookup(t.name);
    } else {
      throw new ExprError(`expected a number, name or "(" but found ${describe(t)}`);
    }
    const after = peek();
    if (after.kind === "num" || after.kind === "id" || after.kind === "lparen") {
      throw new ExprError(`missing operator before ${describe(after)} (use * to multiply)`);
    }
    return value;
  }

  function lookup(name: string): number {
    if (Object.hasOwn(vars, name)) {
      const v = vars[name];
      if (!Number.isFinite(v)) throw new ExprError(`variable ${name} is not a finite number`);
      return v;
    }
    if (Object.hasOwn(CONSTANTS, name)) return CONSTANTS[name];
    if (Object.hasOwn(FUNCTIONS, name))
      throw new ExprError(`${name} is a function — call it like ${name}(x)`);
    throw new ExprError(`unknown variable "${name}"`);
  }

  function call(name: string): number {
    if (!Object.hasOwn(FUNCTIONS, name)) {
      const tip = name === "log" ? " — use ln or log10" : "";
      throw new ExprError(`unknown function "${name}"${tip}`);
    }
    const { arity, fn } = FUNCTIONS[name];
    next(); // "("
    enter();
    const args: number[] = [];
    if (peek().kind !== "rparen") {
      args.push(additive());
      while (peek().kind === "comma") {
        next();
        args.push(additive());
      }
    }
    depth--;
    expect("rparen", ")");
    if (arity === "variadic" ? args.length === 0 : args.length !== arity) {
      const want =
        arity === "variadic" ? "at least 1 argument" : `${arity} argument${arity === 1 ? "" : "s"}`;
      throw new ExprError(`${name}() takes ${want}, got ${args.length}`);
    }
    return fn(...args);
  }

  function expect(kind: Token["kind"], text: string) {
    const t = next();
    if (t.kind !== kind) throw new ExprError(`expected "${text}" but found ${describe(t)}`);
  }

  if (peek().kind === "end") throw new ExprError("expression is empty");
  const result = additive();
  const rest = peek();
  if (rest.kind !== "end") throw new ExprError(`unexpected ${describe(rest)}`);
  if (!Number.isFinite(result)) throw new ExprError("result is not a finite number");
  return result;
}

/** Non-throwing wrapper: `{ ok: true, value }` or `{ ok: false, error }`. */
export function tryEvaluate(
  expr: string,
  vars: Record<string, number> = {},
): { ok: true; value: number } | { ok: false; error: string } {
  try {
    return { ok: true, value: evaluateExpression(expr, vars) };
  } catch (err) {
    if (err instanceof ExprError) return { ok: false, error: err.message };
    throw err;
  }
}
