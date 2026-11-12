/* Warrant — propositional logic engine
 * Parses formulas, builds truth tables, checks validity, and names classic argument forms.
 * Accepted syntax (ASCII or Unicode):
 *   not:  ¬  ~  !  not
 *   and:  ∧  &  &&  and
 *   or:   ∨  |  ||  or
 *   xor:  ⊕  xor
 *   implies: →  ->  =>  implies
 *   iff:  ↔  <->  <=>  iff
 * Variables: a letter followed by letters/digits/underscores (A, B2, intent).
 * Constants: T / F (or true / false).
 */
(function (root) {
  'use strict';

  const KEYWORDS = {
    not: 'NOT', and: 'AND', or: 'OR', xor: 'XOR', implies: 'IMP', iff: 'IFF',
    true: 'TRUE', false: 'FALSE', t: 'TRUE', f: 'FALSE'
  };

  class LogicError extends Error {
    constructor(msg, pos) { super(msg); this.pos = pos; }
  }

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    const s = String(src || '');
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const two = s.slice(i, i + 2), three = s.slice(i, i + 3);
      if (three === '<->' || three === '<=>') { tokens.push({ t: 'IFF', pos: i }); i += 3; continue; }
      if (two === '->' || two === '=>') { tokens.push({ t: 'IMP', pos: i }); i += 2; continue; }
      if (two === '&&') { tokens.push({ t: 'AND', pos: i }); i += 2; continue; }
      if (two === '||') { tokens.push({ t: 'OR', pos: i }); i += 2; continue; }
      if (c === '↔' || c === '≡') { tokens.push({ t: 'IFF', pos: i }); i++; continue; }
      if (c === '→' || c === '⇒' || c === '⊃') { tokens.push({ t: 'IMP', pos: i }); i++; continue; }
      if (c === '∧' || c === '&' || c === '·') { tokens.push({ t: 'AND', pos: i }); i++; continue; }
      if (c === '∨' || c === '|' || c === '+') { tokens.push({ t: 'OR', pos: i }); i++; continue; }
      if (c === '⊕') { tokens.push({ t: 'XOR', pos: i }); i++; continue; }
      if (c === '¬' || c === '~' || c === '!') { tokens.push({ t: 'NOT', pos: i }); i++; continue; }
      if (c === '(' || c === '[') { tokens.push({ t: 'LP', pos: i }); i++; continue; }
      if (c === ')' || c === ']') { tokens.push({ t: 'RP', pos: i }); i++; continue; }
      if (c === '⊤') { tokens.push({ t: 'TRUE', pos: i }); i++; continue; }
      if (c === '⊥') { tokens.push({ t: 'FALSE', pos: i }); i++; continue; }
      if (/[A-Za-z]/.test(c)) {
        let j = i + 1;
        while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
        const word = s.slice(i, j);
        const kw = KEYWORDS[word.toLowerCase()];
        // Single-letter T/F are constants only when uppercase; lowercase t/f stay variables.
        if (kw && !(word.length === 1 && word === word.toLowerCase())) tokens.push({ t: kw, pos: i });
        else tokens.push({ t: 'VAR', v: word, pos: i });
        i = j; continue;
      }
      throw new LogicError(`Unexpected character “${c}”`, i);
    }
    tokens.push({ t: 'EOF', pos: s.length });
    return tokens;
  }

  // Precedence (low → high): IFF, IMP (right-assoc), OR/XOR, AND, NOT
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const eat = (t) => {
      if (toks[p].t !== t) throw new LogicError(`Expected ${describe(t)} but found ${describe(toks[p].t)}`, toks[p].pos);
      return toks[p++];
    };
    function iff() {
      let left = imp();
      while (peek().t === 'IFF') { p++; left = { type: 'iff', a: left, b: imp() }; }
      return left;
    }
    function imp() {
      const left = or();
      if (peek().t === 'IMP') { p++; return { type: 'imp', a: left, b: imp() }; }
      return left;
    }
    function or() {
      let left = and();
      while (peek().t === 'OR' || peek().t === 'XOR') {
        const op = toks[p++].t === 'OR' ? 'or' : 'xor';
        left = { type: op, a: left, b: and() };
      }
      return left;
    }
    function and() {
      let left = unary();
      while (peek().t === 'AND') { p++; left = { type: 'and', a: left, b: unary() }; }
      return left;
    }
    function unary() {
      const tk = peek();
      if (tk.t === 'NOT') { p++; return { type: 'not', a: unary() }; }
      if (tk.t === 'LP') { p++; const e = iff(); eat('RP'); return e; }
      if (tk.t === 'VAR') { p++; return { type: 'var', name: tk.v }; }
      if (tk.t === 'TRUE') { p++; return { type: 'const', value: true }; }
      if (tk.t === 'FALSE') { p++; return { type: 'const', value: false }; }
      if (tk.t === 'EOF') throw new LogicError('Formula ends too early — something is missing', tk.pos);
      throw new LogicError(`Unexpected ${describe(tk.t)}`, tk.pos);
    }
    if (peek().t === 'EOF') throw new LogicError('Empty formula', 0);
    const ast = iff();
    if (peek().t !== 'EOF') throw new LogicError(`Unexpected ${describe(peek().t)} — check your parentheses or operators`, peek().pos);
    return ast;
  }

  function describe(t) {
    return ({ IFF: '“↔”', IMP: '“→”', AND: '“∧”', OR: '“∨”', XOR: '“⊕”', NOT: '“¬”', LP: '“(”', RP: '“)”', VAR: 'a variable', EOF: 'end of formula', TRUE: '“T”', FALSE: '“F”' })[t] || t;
  }

  function evaluate(ast, env) {
    switch (ast.type) {
      case 'var': return !!env[ast.name];
      case 'const': return ast.value;
      case 'not': return !evaluate(ast.a, env);
      case 'and': return evaluate(ast.a, env) && evaluate(ast.b, env);
      case 'or': return evaluate(ast.a, env) || evaluate(ast.b, env);
      case 'xor': return evaluate(ast.a, env) !== evaluate(ast.b, env);
      case 'imp': return !evaluate(ast.a, env) || evaluate(ast.b, env);
      case 'iff': return evaluate(ast.a, env) === evaluate(ast.b, env);
    }
    throw new Error('Unknown node ' + ast.type);
  }

  function variables(ast, set = new Set()) {
    if (!ast) return set;
    if (ast.type === 'var') set.add(ast.name);
    if (ast.a) variables(ast.a, set);
    if (ast.b) variables(ast.b, set);
    return set;
  }

  const PREC = { iff: 1, imp: 2, or: 3, xor: 3, and: 4, not: 5, var: 6, const: 6 };
  const SYM = { iff: '↔', imp: '→', or: '∨', xor: '⊕', and: '∧' };

  function format(ast, parentPrec = 0, side) {
    let out, prec = PREC[ast.type];
    switch (ast.type) {
      case 'var': return ast.name;
      case 'const': return ast.value ? '⊤' : '⊥';
      case 'not': out = '¬' + format(ast.a, prec); break;
      default: {
        // implication is right-associative: parenthesize a left-nested implication
        const leftPrec = ast.type === 'imp' ? prec + 1 : prec;
        const rightPrec = ast.type === 'imp' ? prec : prec + 1;
        out = `${format(ast.a, leftPrec, 'l')} ${SYM[ast.type]} ${format(ast.b, rightPrec, 'r')}`;
      }
    }
    return prec < parentPrec ? `(${out})` : out;
  }

  /** Render a formula in plain English, substituting proposition text where available. */
  function toEnglish(ast, labels = {}, depth = 0) {
    const L = (n) => labels[n] ? `“${labels[n]}”` : n;
    const sub = (x) => {
      const s = toEnglish(x, labels, depth + 1);
      return (x.type === 'var' || x.type === 'const' || x.type === 'not') ? s : `(${s})`;
    };
    switch (ast.type) {
      case 'var': return L(ast.name);
      case 'const': return ast.value ? 'true' : 'false';
      case 'not': return ast.a.type === 'var' ? `not ${L(ast.a.name)}` : `it is not the case that ${sub(ast.a)}`;
      case 'and': return `${sub(ast.a)} and ${sub(ast.b)}`;
      case 'or': return `${sub(ast.a)} or ${sub(ast.b)}`;
      case 'xor': return `either ${sub(ast.a)} or ${sub(ast.b)}, but not both`;
      case 'imp': return `if ${sub(ast.a)}, then ${sub(ast.b)}`;
      case 'iff': return `${sub(ast.a)} if and only if ${sub(ast.b)}`;
    }
  }

  const key = (ast) => format(ast);
  const eq = (x, y) => key(x) === key(y);
  const isNeg = (x, y) => (x.type === 'not' && eq(x.a, y)) || (y.type === 'not' && eq(y.a, x));

  /** Identify named forms. Returns [{name, valid, explain}] */
  function detectForms(premises, conclusion) {
    const forms = [];
    const add = (name, valid, explain) => { if (!forms.some(f => f.name === name)) forms.push({ name, valid, explain }); };
    const n = premises.length;
    for (let i = 0; i < n; i++) {
      const P = premises[i];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const Q = premises[j];
        if (P.type === 'imp') {
          if (eq(Q, P.a) && eq(conclusion, P.b)) add('Modus ponens', true, 'If P then Q; P is true; therefore Q.');
          if (isNeg(Q, P.b) && isNeg(conclusion, P.a)) add('Modus tollens', true, 'If P then Q; Q is false; therefore P is false.');
          if (eq(Q, P.b) && eq(conclusion, P.a)) add('Affirming the consequent', false, 'If P then Q; Q is true; therefore P — invalid. Q could be true for another reason.');
          if (isNeg(Q, P.a) && isNeg(conclusion, P.b)) add('Denying the antecedent', false, 'If P then Q; P is false; therefore Q is false — invalid. Q could still be true for another reason.');
          if (Q.type === 'imp' && eq(P.b, Q.a) && conclusion.type === 'imp' && eq(conclusion.a, P.a) && eq(conclusion.b, Q.b))
            add('Hypothetical syllogism (chain)', true, 'If P then Q; if Q then R; therefore if P then R.');
        }
        if (P.type === 'or') {
          if (isNeg(Q, P.a) && eq(conclusion, P.b)) add('Disjunctive syllogism', true, 'P or Q; not P; therefore Q.');
          if (isNeg(Q, P.b) && eq(conclusion, P.a)) add('Disjunctive syllogism', true, 'P or Q; not Q; therefore P.');
          if ((eq(Q, P.a) && isNeg(conclusion, P.b)) || (eq(Q, P.b) && isNeg(conclusion, P.a)))
            add('Affirming a disjunct', false, 'P or Q; P; therefore not Q — invalid. “Or” allows both to be true (unless it is exclusive).');
        }
      }
    }
    // Longer chains: A→B, B→C, C→D ⊢ A→D
    if (conclusion.type === 'imp') {
      const imps = premises.filter(p => p.type === 'imp');
      if (imps.length >= 3) {
        let cur = conclusion.a, steps = 0; const used = new Set();
        while (steps < imps.length) {
          const nxt = imps.findIndex((p, k) => !used.has(k) && eq(p.a, cur));
          if (nxt < 0) break;
          used.add(nxt); cur = imps[nxt].b; steps++;
          if (eq(cur, conclusion.b)) { add(`Chain argument (${steps} linked conditionals)`, true, 'A sequence of conditionals where each consequent feeds the next antecedent.'); break; }
        }
      }
    }
    // Constructive dilemma: P→Q, R→S, P∨R ⊢ Q∨S
    if (conclusion.type === 'or') {
      const imps = premises.filter(p => p.type === 'imp');
      const ors = premises.filter(p => p.type === 'or');
      for (const o of ors) for (const a of imps) for (const b of imps) {
        if (a !== b && eq(o.a, a.a) && eq(o.b, b.a) && eq(conclusion.a, a.b) && eq(conclusion.b, b.b))
          add('Constructive dilemma', true, 'If P then Q; if R then S; P or R; therefore Q or S.');
      }
    }
    // Conjunction / simplification
    if (n === 1 && premises[0].type === 'and' && (eq(conclusion, premises[0].a) || eq(conclusion, premises[0].b)))
      add('Simplification', true, 'P and Q; therefore P.');
    // Converse error with single premise
    if (n === 1 && premises[0].type === 'imp' && conclusion.type === 'imp' && eq(conclusion.a, premises[0].b) && eq(conclusion.b, premises[0].a))
      add('Converse fallacy', false, '“If P then Q” does not imply “If Q then P.”');
    if (n === 1 && premises[0].type === 'imp' && conclusion.type === 'imp' && isNeg(conclusion.a, premises[0].a) && isNeg(conclusion.b, premises[0].b))
      add('Inverse fallacy', false, '“If P then Q” does not imply “If not P then not Q.”');
    if (n === 1 && premises[0].type === 'imp' && conclusion.type === 'imp' && isNeg(conclusion.a, premises[0].b) && isNeg(conclusion.b, premises[0].a))
      add('Contraposition', true, '“If P then Q” is equivalent to “If not Q then not P.”');
    return forms;
  }

  /**
   * Full analysis of premises ⊢ conclusion.
   * @param {string[]} premiseSrcs
   * @param {string} conclusionSrc
   */
  function analyze(premiseSrcs, conclusionSrc, opts = {}) {
    const maxVars = opts.maxVars || 14;
    const errors = [];
    const premises = [];
    (premiseSrcs || []).forEach((src, i) => {
      if (!String(src || '').trim()) return;
      try { premises.push({ src, ast: parse(src), index: i }); }
      catch (e) { errors.push({ where: `Premise ${i + 1}`, index: i, message: e.message, pos: e.pos }); }
    });
    let conclusion = null;
    if (String(conclusionSrc || '').trim()) {
      try { conclusion = { src: conclusionSrc, ast: parse(conclusionSrc) }; }
      catch (e) { errors.push({ where: 'Conclusion', index: -1, message: e.message, pos: e.pos }); }
    }
    if (errors.length) return { ok: false, errors };
    if (!conclusion) return { ok: false, errors: [{ where: 'Conclusion', index: -1, message: 'Add a conclusion to test.' }] };

    const vs = new Set();
    premises.forEach(p => variables(p.ast, vs));
    variables(conclusion.ast, vs);
    const vars = [...vs].sort((a, b) => a.length - b.length || a.localeCompare(b));
    if (vars.length > maxVars) return { ok: false, errors: [{ where: 'Formula', index: -1, message: `Too many variables (${vars.length}). Limit is ${maxVars}.` }] };

    const rows = [];
    const total = 1 << vars.length;
    let counterexample = null, premisesSatisfiable = false, conclusionAlwaysTrue = true;
    for (let m = 0; m < total; m++) {
      const env = {};
      // Standard truth-table order: first row all true
      vars.forEach((v, k) => { env[v] = !((m >> (vars.length - 1 - k)) & 1); });
      const pv = premises.map(p => evaluate(p.ast, env));
      const cv = evaluate(conclusion.ast, env);
      const allP = pv.every(Boolean);
      if (!cv) conclusionAlwaysTrue = false;
      if (allP) premisesSatisfiable = true;
      const counter = allP && !cv;
      if (counter && !counterexample) counterexample = { ...env };
      rows.push({ env, premises: pv, conclusion: cv, critical: allP, counter });
    }
    const valid = !counterexample;
    const forms = detectForms(premises.map(p => p.ast), conclusion.ast);
    return {
      ok: true, vars, rows, valid, counterexample,
      premisesConsistent: premisesSatisfiable,
      tautology: conclusionAlwaysTrue,
      premises: premises.map(p => ({ src: p.src, pretty: format(p.ast), ast: p.ast })),
      conclusion: { src: conclusion.src, pretty: format(conclusion.ast), ast: conclusion.ast },
      forms
    };
  }

  const api = { tokenize, parse, evaluate, variables, format, toEnglish, analyze, detectForms, LogicError };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
