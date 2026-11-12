/* Warrant — argument soundness analyzer
 * Offline, heuristic. It cannot know whether your evidence is TRUE — it checks whether the
 * argument is complete, well-supported, logically connected, calibrated, and ready for attack.
 */
(function (root) {
  'use strict';

  const STOP = new Set(('a an the and or but if then so of to in on at by for with from as is are was were be been being this that these those it its it\'s they them their there here we our you your he she his her i me my not no do does did done have has had will would should could can may might must than too very just also into about over under more most less least such which who whom whose what when where why how all any each some because therefore thus hence since while though although only even both either neither nor own same other another one two three').split(' '));

  const ABSOLUTES = /\b(all|always|never|every|everyone|everybody|no one|nobody|none|nothing|everything|proves?|proven|undeniabl[ey]|indisputabl[ey]|unquestionabl[ey]|certainly|definitely|obviously|clearly|without (a )?doubt|100%|impossible|guaranteed?)\b/gi;
  const HEDGES = /\b(likely|probably|suggests?|tends? to|often|usually|generally|in most cases|may|might|could|appears?|seems?|evidence indicates)\b/gi;
  const SPECIFIC = /(\d|%|\b(19|20)\d{2}\b|\b(according to|study|survey|report|data|census|court|ruling|statute|section|percent|published|journal|university|department|bureau|analysis of)\b)/i;
  const VAGUE_SOURCE = /\b(studies show|research shows|experts (say|agree)|scientists (say|agree)|they say|people say|it is (well )?known|sources say)\b/i;

  const QUALIFIERS = [
    { id: 'certainly', label: 'Certainly', weight: 5 },
    { id: 'very-likely', label: 'Very likely', weight: 4 },
    { id: 'probably', label: 'Probably', weight: 3 },
    { id: 'plausibly', label: 'Plausibly', weight: 2 },
    { id: 'possibly', label: 'Possibly', weight: 1 }
  ];

  const FALLACIES = [
    { name: 'Ad hominem', re: /\b(idiot|stupid|moron|liar|hypocrite|clown|ignorant|you people|of course (he|she|they) would say|what do you expect from)\b/i,
      explain: 'Attacks the person instead of the argument. Judges discount it and it hands your opponent the high ground.', fix: 'Target the reasoning or evidence, not the speaker.' },
    { name: 'Appeal to popularity', re: /\b(everyone knows|everybody knows|most people (believe|agree|think)|everybody agrees|it'?s common sense|nobody believes|the majority (believe|agree)s?)\b/i,
      explain: 'Popularity is not evidence that something is true.', fix: 'Replace with the evidence that persuaded those people.' },
    { name: 'Slippery slope', re: /\b(will inevitably|inevitably lead|will (eventually )?lead to|next thing you know|before you know it|slippery slope|opens? the floodgates|where does it end|domino)\b/i,
      explain: 'Claims a chain of consequences without proving each link.', fix: 'Show evidence for each step, or narrow the claim to the first consequence.' },
    { name: 'False dilemma', re: /\b(either\b.{1,60}\bor\b|only two (options|choices)|no other (choice|option|way)|you'?re either|if you'?re not .{1,30} you'?re)\b/i,
      explain: 'Presents two options as the only possibilities.', fix: 'Acknowledge other options and explain why yours is still best.' },
    { name: 'Vague appeal to authority', re: VAGUE_SOURCE,
      explain: 'Unnamed “studies” or “experts” are easy to dismiss.', fix: 'Name the source, author, year, and the specific finding.' },
    { name: 'Hasty generalization', re: /\b(i know (someone|a guy|a person)|my (friend|cousin|neighbor|uncle|aunt)|one time|this one (time|case)|i (once )?saw)\b/i,
      explain: 'Draws a general rule from one or a few anecdotes.', fix: 'Add data that shows the pattern holds broadly.' },
    { name: 'Tu quoque (whataboutism)', re: /\b(what about|you (did|do) it too|you also|so did you|look who'?s talking)\b/i,
      explain: 'Deflects by pointing at the opponent’s behavior instead of answering.', fix: 'Answer the point directly first; raise consistency separately if it matters.' },
    { name: 'Post hoc (false cause)', re: /\b(ever since|right after|shortly after|after .{1,40}, (so|therefore)|immediately after)\b/i,
      explain: 'Sequence in time is not proof of cause.', fix: 'Rule out other causes or cite a causal study.' },
    { name: 'Loaded language', re: /\b(disgusting|evil|insane|pathetic|ridiculous|absurd|outrageous|brainwashed|sheep)\b/i,
      explain: 'Emotionally loaded words can read as a substitute for argument.', fix: 'Use neutral language; let the evidence carry the weight.' },
    { name: 'Circular phrasing', re: /\b(because it is|because that'?s (just )?how it is|by definition,? it'?s)\b/i,
      explain: 'May be assuming the conclusion rather than supporting it.', fix: 'Give an independent reason that does not restate the claim.' }
  ];

  function stem(w) {
    return w.replace(/(ies)$/, 'y').replace(/(ing|edly|ed|es|s|ly)$/, '').replace(/(.)\1$/, '$1');
  }
  function words(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && w.length > 2).map(stem);
  }
  function overlap(a, b) {
    const A = new Set(words(a)), B = new Set(words(b));
    if (!A.size || !B.size) return { shared: [], jaccard: 0, ofA: 0 };
    const shared = [...A].filter(x => B.has(x));
    return { shared, jaccard: shared.length / new Set([...A, ...B]).size, ofA: shared.length / A.size };
  }
  const filled = (s) => String(s || '').trim().length > 0;
  const sentences = (s) => String(s || '').split(/(?<=[.!?])\s+/).filter(x => x.trim().length > 3);
  const count = (re, s) => (String(s || '').match(re) || []).length;

  function excerpt(text, re) {
    const m = String(text).match(re);
    if (!m) return '';
    const i = m.index || 0, s = Math.max(0, i - 30), e = Math.min(text.length, i + m[0].length + 30);
    return (s > 0 ? '…' : '') + text.slice(s, e).trim() + (e < text.length ? '…' : '');
  }

  function analyze(arg, opts = {}) {
    const F = [];
    const push = (cat, level, title, detail, field, extra) => F.push({ cat, level, title, detail, field, ...(extra || {}) });

    const data = (arg.data || []).filter(d => filled(d.text));
    const backing = (arg.backing || []).filter(d => filled(d.text));
    const rebuttals = (arg.rebuttals || []).filter(r => filled(r.objection) || filled(r.response));
    const defs = (arg.definitions || []).filter(d => filled(d.term));
    const q = QUALIFIERS.find(x => x.id === (arg.qualifier && arg.qualifier.level));
    const claim = String(arg.claim || '').trim();
    const warrant = String(arg.warrant || '').trim();

    if (!claim) {
      return { incomplete: true, score: 0, verdict: 'Incomplete', summary: 'Write a claim to begin analysis.', findings: [], categories: {}, attack: [] };
    }

    /* ---------- STRUCTURE ---------- */
    const claimSent = sentences(claim).length;
    if (claimSent > 1) push('structure', 'warn', 'Claim contains more than one sentence', 'A claim should be one clear, debatable assertion. Extra sentences are usually data or warrant in disguise.', 'claim');
    else if (claim.split(/\s+/).length < 4) push('structure', 'warn', 'Claim is very short', 'Make sure it states a full, debatable position — who, what, and how strongly.', 'claim');
    else push('structure', 'pass', 'Claim is a single assertion', '', 'claim');

    if (!data.length) push('structure', 'fail', 'No data', 'Every claim needs grounds. What facts, examples, or statistics support it?', 'data');
    if (!filled(warrant)) push('structure', 'fail', 'Missing warrant', 'The warrant is the bridge that explains WHY your data proves your claim. Without it, your opponent can accept every fact and still reject the conclusion.', 'warrant');
    else push('structure', 'pass', 'Warrant present', '', 'warrant');
    if (!backing.length) push('structure', 'warn', 'No backing for the warrant', 'If your opponent asks “why should we accept that principle?”, backing is your answer: a law, study, precedent, or widely accepted standard.', 'backing');
    else push('structure', 'pass', 'Warrant is backed', '', 'backing');
    if (!q) push('structure', 'warn', 'No qualifier chosen', 'State how strong your claim is. Calibrated claims are harder to defeat.', 'qualifier');
    if (!rebuttals.length) push('structure', 'warn', 'No rebuttals anticipated', 'Pre-empting the best objection is the clearest mark of a strong debater.', 'rebuttals');
    if (!defs.length) push('structure', 'info', 'No key terms defined', 'Contested words in your claim decide most debates. Define them first and you control the frame.', 'definitions');
    else push('structure', 'pass', `${defs.length} key term${defs.length > 1 ? 's' : ''} defined`, '', 'definitions');

    /* ---------- SUPPORT ---------- */
    if (data.length === 1) push('support', 'warn', 'Single piece of evidence', 'One example invites the “that’s just one case” response. Add independent evidence.', 'data');
    if (data.length >= 2) push('support', 'pass', `${data.length} pieces of evidence`, '', 'data');
    const sourced = data.filter(d => filled(d.source)).length;
    if (data.length && sourced < data.length) push('support', sourced === 0 ? 'fail' : 'warn', `${data.length - sourced} of ${data.length} data points have no source`, 'Attach where each fact comes from so it survives “where did you get that?”.', 'data');
    else if (data.length) push('support', 'pass', 'Every data point is sourced', '', 'data');
    const vague = data.filter(d => !SPECIFIC.test(d.text + ' ' + (d.source || '')));
    if (vague.length) push('support', 'warn', `${vague.length} data point${vague.length > 1 ? 's are' : ' is'} vague`, 'Specifics (numbers, dates, named sources) are much harder to dispute.', 'data', { items: vague.map(v => v.text.slice(0, 80)) });
    const unsourcedBacking = backing.filter(b => !filled(b.source)).length;
    if (backing.length && unsourcedBacking) push('support', 'warn', 'Backing lacks a source', 'Backing is only as strong as its authority — name it.', 'backing');
    // Diversity: are data points just restatements of each other?
    for (let i = 0; i < data.length; i++) for (let j = i + 1; j < data.length; j++) {
      if (overlap(data[i].text, data[j].text).jaccard > 0.6) push('support', 'warn', 'Two data points look like the same evidence', 'Independent sources make a claim far sturdier than repetition.', 'data');
    }

    /* ---------- INFERENCE ---------- */
    if (filled(warrant)) {
      const wc = overlap(warrant, claim);
      const wd = data.length ? Math.max(...data.map(d => overlap(warrant, d.text).ofA)) : 0;
      if (wc.shared.length === 0) push('inference', 'warn', 'Warrant may not connect to the claim', 'The warrant shares no key terms with the claim. Check it explains why the data leads to THIS conclusion.', 'warrant');
      else push('inference', 'pass', 'Warrant connects to claim', `Shared concepts: ${wc.shared.slice(0, 5).join(', ')}`, 'warrant');
      if (data.length && wd === 0) push('inference', 'warn', 'Warrant may not connect to the data', 'Mention the kind of evidence you used, so the bridge is visible.', 'warrant');
      if (overlap(warrant, claim).jaccard > 0.7) push('inference', 'fail', 'Warrant restates the claim', 'This looks circular (begging the question). The warrant should be a general principle, not the claim reworded.', 'warrant');
      if (warrant.split(/\s+/).length < 6) push('inference', 'warn', 'Warrant is thin', 'Spell out the general principle: “When [type of data] is true, [type of claim] follows because…”', 'warrant');
    }
    data.forEach(d => {
      if (overlap(d.text, claim).jaccard > 0.7) push('inference', 'fail', 'Data restates the claim', `“${d.text.slice(0, 70)}” repeats your conclusion rather than supporting it.`, 'data');
    });
    // Calibration: qualifier vs absolutes vs support
    const abs = count(ABSOLUTES, claim);
    const strength = data.length + (sourced ? 1 : 0) + (backing.length ? 1 : 0);
    if (abs > 0 && (!q || q.weight >= 4)) push('inference', strength >= 5 ? 'warn' : 'fail', 'Absolute language in claim', `Words like “${(claim.match(ABSOLUTES) || [])[0]}” mean one counter-example defeats you. Consider a qualifier or narrower wording.`, 'claim');
    if (q && q.weight === 5 && strength < 5) push('inference', 'warn', 'Overclaiming', '“Certainly” needs very strong, multi-source support. “Very likely” or “probably” is safer and more persuasive to judges.', 'qualifier');
    if (q && q.weight <= 2 && strength >= 5) push('inference', 'info', 'You may be underclaiming', 'Your support is strong — you can afford a firmer qualifier.', 'qualifier');
    if (q && !(abs > 0 && q.weight >= 4) && !(q.weight === 5 && strength < 5)) push('inference', 'pass', `Qualifier “${q.label}” is calibrated`, '', 'qualifier');

    // Formal logic panel
    const lg = arg.logic || {};
    const prem = (lg.premises || []).filter(filled);
    if (prem.length && filled(lg.conclusion) && root.Logic) {
      const r = root.Logic.analyze(prem, lg.conclusion);
      if (!r.ok) push('inference', 'warn', 'Formal logic has an error', r.errors[0].where + ': ' + r.errors[0].message, 'logic');
      else if (!r.premisesConsistent) push('inference', 'fail', 'Premises contradict each other', 'No situation makes all premises true. An opponent can show your own premises conflict.', 'logic');
      else if (r.valid) push('inference', 'pass', 'Formal structure is valid', r.forms.length ? `Form: ${r.forms.filter(f => f.valid).map(f => f.name).join(', ') || 'valid by truth table'}` : 'Verified by truth table.', 'logic');
      else {
        const bad = r.forms.find(f => !f.valid);
        push('inference', 'fail', bad ? `Invalid form: ${bad.name}` : 'Formal structure is invalid', bad ? bad.explain : 'There is a case where every premise is true but the conclusion is false.', 'logic');
      }
    }

    /* ---------- FALLACY CUES ---------- */
    const texts = [
      ['claim', claim], ['warrant', warrant],
      ...data.map(d => ['data', d.text]), ...backing.map(b => ['backing', b.text]),
      ...rebuttals.map(r => ['rebuttals', r.response || ''])
    ];
    const seen = new Set();
    FALLACIES.forEach(fx => {
      texts.forEach(([field, t]) => {
        if (!t || seen.has(fx.name + field)) return;
        if (fx.re.test(t)) {
          seen.add(fx.name + field);
          push('inference', fx.name === 'Loaded language' || fx.name === 'Vague appeal to authority' ? 'warn' : 'fail', `Possible ${fx.name.toLowerCase()}`, fx.explain + ' ' + fx.fix, field, { quote: excerpt(t, fx.re), fallacy: fx.name });
        }
      });
    });

    /* ---------- RESILIENCE ---------- */
    const unanswered = rebuttals.filter(r => filled(r.objection) && !filled(r.response));
    if (unanswered.length) push('resilience', 'fail', `${unanswered.length} objection${unanswered.length > 1 ? 's' : ''} without a response`, 'Never raise an objection you don’t answer — it does your opponent’s work.', 'rebuttals');
    if (rebuttals.length === 1) push('resilience', 'warn', 'Only one objection prepared', 'Prepare responses to the 2–3 strongest attacks, including one on your warrant.', 'rebuttals');
    if (rebuttals.length >= 2 && !unanswered.length) push('resilience', 'pass', `${rebuttals.length} objections answered`, '', 'rebuttals');
    const hitsWarrant = rebuttals.some(r => filled(warrant) && overlap(r.objection, warrant).shared.length > 0);
    if (rebuttals.length && filled(warrant) && !hitsWarrant) push('resilience', 'info', 'No objection targets your warrant', 'Skilled opponents attack the warrant (“that doesn’t follow”). Prepare for it.', 'rebuttals');
    rebuttals.forEach(r => {
      if (filled(r.response) && r.response.trim().split(/\s+/).length < 6) push('resilience', 'warn', 'A response is very brief', `“${r.response.slice(0, 60)}” — a strong response concedes what’s true, then shows why your claim still stands.`, 'rebuttals');
    });

    /* ---------- SCORE ---------- */
    const cats = { structure: 'Structure', support: 'Support', inference: 'Inference', resilience: 'Resilience' };
    const weights = { structure: 0.3, support: 0.25, inference: 0.3, resilience: 0.15 };
    const categories = {};
    let total = 0;
    Object.keys(cats).forEach(c => {
      const items = F.filter(f => f.cat === c);
      let s = 100;
      items.forEach(f => { if (f.level === 'fail') s -= 28; if (f.level === 'warn') s -= 11; if (f.level === 'info') s -= 3; });
      if (c === 'resilience' && !rebuttals.length) s = Math.min(s, 30);
      if (c === 'support' && !data.length) s = 0;
      s = Math.max(0, Math.min(100, s));
      categories[c] = { label: cats[c], score: s, items };
      total += s * weights[c];
    });
    const score = Math.round(total);
    const fails = F.filter(f => f.level === 'fail').length;
    let verdict;
    if (score >= 85 && fails === 0) verdict = 'Sound';
    else if (score >= 70) verdict = 'Strong, with gaps';
    else if (score >= 50) verdict = 'Fragile';
    else verdict = 'Weak';
    const summary = ({
      'Sound': 'Complete, supported, and calibrated. Pressure-test it out loud.',
      'Strong, with gaps': 'The core holds. Close the flagged gaps before your opponent finds them.',
      'Fragile': 'An opponent can likely break this. Start with the red items.',
      'Weak': 'Key parts are missing or unsupported. Rebuild from the warrant out.'
    })[verdict];

    return { incomplete: false, score, verdict, summary, findings: F, categories, attack: attackPlan(arg, { data, backing, rebuttals, q, abs, sourced, warrant, claim, defs }) };
  }

  /** Rank where an opponent will hit first. */
  function attackPlan(arg, x) {
    const plan = [];
    const add = (part, weakness, question, prep) => plan.push({ part, weakness, question, prep });
    add('Warrant', !filled(x.warrant) ? 10 : (x.backing.length ? 3 : 6),
      '“Even if your facts are true, why does that prove your claim?”',
      filled(x.warrant) ? 'State the principle plainly, then cite your backing.' : 'Write the warrant — this is your most exposed point.');
    add('Data', !x.data.length ? 10 : Math.max(1, 7 - x.data.length * 2 - x.sourced),
      '“Where is that from? Isn’t that just one example?”',
      'Lead with your best-sourced, most specific evidence.');
    add('Definitions', x.defs.length ? 2 : 6,
      '“What do you even mean by that word?”',
      x.defs.length ? 'Open by stating your definitions and asking your opponent to accept them.' : 'Define the contested term in your claim before they do.');
    add('Qualifier', x.abs && (!x.q || x.q.weight >= 4) ? 8 : (x.q && x.q.weight === 5 ? 6 : 2),
      '“Always? Here’s a counter-example.”',
      'Narrow the claim or soften the qualifier so a single exception doesn’t sink it.');
    add('Backing', x.backing.length ? 2 : 5,
      '“Says who? Why should we accept that principle?”',
      'Name a law, precedent, study, or widely accepted standard.');
    add('Rebuttals', !x.rebuttals.length ? 7 : x.rebuttals.some(r => !filled(r.response)) ? 6 : 2,
      '“You never addressed my strongest point.”',
      'Pre-empt the best objection in your opening, not your closing.');
    return plan.sort((a, b) => b.weakness - a.weakness);
  }

  const api = { analyze, QUALIFIERS, FALLACIES, overlap, words };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Analyzer = api;
})(typeof window !== 'undefined' ? window : globalThis);
