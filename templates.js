/* Warrant — argument templates. Each template supplies guiding hints and optional starting structure. */
(function (root) {
  'use strict';

  const BASE_HINTS = {
    frame: 'How should the audience see this question? e.g. “This is about outcomes, not intentions.”',
    burden: 'Who has to prove what? e.g. “My opponent must show a better alternative exists.”',
    claim: 'One clear, debatable assertion you will defend.',
    data: 'A fact, statistic, example, or testimony that supports the claim.',
    warrant: 'The general principle that explains WHY this data proves the claim. “When ___, then ___, because ___.”',
    backing: 'Why the warrant itself is trustworthy: a law, study, precedent, or accepted standard.',
    qualifier: 'Pick the strongest level your evidence can defend. Add any conditions or exceptions below.',
    objection: 'The strongest point your opponent could make.',
    response: 'Concede what’s true, then show why your claim still stands.',
    notes: 'Brainstorm freely — angles, questions, phrasing, counter-examples.'
  };

  const TEMPLATES = [
    {
      id: 'toulmin', name: 'Classic Toulmin', glyph: 'T',
      blurb: 'The full six-part model. Best all-purpose starting point.',
      hints: {},
      seed: () => ({})
    },
    {
      id: 'definitional', name: 'Definition & criteria', glyph: 'D',
      blurb: 'Is X a Y? Define the term, set criteria, and show they’re met. Uses sufficient conditions: (A) OR (B AND C) → R.',
      hints: {
        frame: 'Set the definition before anything else — whoever defines the term frames the debate.',
        claim: 'X is [category] — under the definition stated above.',
        data: 'Evidence that one specific criterion is met. Name the criterion it proves.',
        warrant: 'Anything that meets [criterion] fits the definition of [term], because the definition is…',
        backing: 'Where your definition comes from: dictionary, statute, scholarly source, or agreed standard.',
        objection: 'Your definition is too broad / too narrow, or the criterion isn’t actually met.'
      },
      seed: () => ({
        definitions: [{ term: '', meaning: '' }],
        logic: {
          props: [
            { sym: 'A', text: 'Criterion A is met' },
            { sym: 'B', text: 'Criterion B is met' },
            { sym: 'C', text: 'Criterion C is met' },
            { sym: 'R', text: 'X fits the definition' }
          ],
          premises: ['(A | (B & C)) -> R', 'B', 'C'],
          conclusion: 'R'
        }
      })
    },
    {
      id: 'causal', name: 'Cause & effect', glyph: 'C',
      blurb: 'X causes Y. Establish correlation, mechanism, and rule out alternatives.',
      hints: {
        claim: '[Cause] leads to [effect] (in [context]).',
        data: 'Evidence the two move together — and ideally a study that controls for other factors.',
        warrant: 'The mechanism: HOW the cause produces the effect.',
        backing: 'Research or expert consensus supporting the mechanism.',
        qualifier: 'Causal claims are rarely certain. “Significantly contributes to” is often safer than “causes.”',
        objection: 'Correlation isn’t causation — another factor explains it.'
      },
      seed: () => ({ rebuttals: [{ objection: 'Correlation isn’t causation — a third factor could explain both.', response: '' }] })
    },
    {
      id: 'policy', name: 'Policy proposal', glyph: 'P',
      blurb: 'We should do X. Show the problem, the solution, and that benefits outweigh costs.',
      hints: {
        frame: 'Weigh by: lives, money, rights, fairness? Name the yardstick.',
        claim: '[Actor] should [action] to [goal].',
        data: 'Evidence of the harm in the status quo, or evidence the plan works elsewhere.',
        warrant: 'If a policy addresses [harm] at acceptable cost, it should be adopted, because…',
        backing: 'Precedent: where this worked, or the principle justifying action.',
        objection: 'It costs too much / won’t work / has unintended consequences.'
      },
      seed: () => ({
        rebuttals: [
          { objection: 'The cost outweighs the benefit.', response: '' },
          { objection: 'It will cause unintended consequences.', response: '' }
        ]
      })
    },
    {
      id: 'value', name: 'Value judgment', glyph: 'V',
      blurb: 'X is better / more important / more just than Y. Set the criterion, then weigh.',
      hints: {
        frame: 'Name your value (e.g. fairness) and your criterion for measuring it.',
        claim: '[X] is more [value] than [Y].',
        data: 'Evidence comparing X and Y on your criterion.',
        warrant: 'The option that better achieves [criterion] better upholds [value], because…',
        backing: 'Why this criterion is the right measure of the value.',
        objection: 'You picked the wrong criterion — measured another way, Y wins.'
      },
      seed: () => ({ definitions: [{ term: 'Value', meaning: '' }, { term: 'Criterion', meaning: '' }] })
    },
    {
      id: 'counter', name: 'Dismantle an opponent', glyph: '⚔',
      blurb: 'Map your opponent’s argument into Toulmin parts to find exactly where it breaks.',
      mode: 'opponent',
      hints: {
        frame: 'How is your opponent framing this? Is the frame itself fair?',
        claim: 'Their claim, stated fairly (steelman it — a strawman will backfire).',
        data: 'The evidence THEY offered. Note missing sources.',
        warrant: 'The unstated assumption connecting their data to their claim. This is usually the weakest point.',
        backing: 'What (if anything) they offered to support that assumption.',
        qualifier: 'How strongly did they state it? Absolutes are easy to break with one counter-example.',
        objection: 'Your attack on one part of their argument.',
        response: 'How they’ll likely defend — and your answer.'
      },
      seed: () => ({})
    }
  ];

  function hintsFor(id) {
    const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[0];
    return Object.assign({}, BASE_HINTS, t.hints);
  }

  root.Templates = { TEMPLATES, hintsFor, BASE_HINTS };
})(window);
