# Penji demos

Working demonstrations of how I build Penji, my program data platform for community health programs.  Penji's own code is private; these are written fresh, on synthetic data, with the same architecture: one type system shared by every package, constants in one place, standards and forms as definitions, and engines that read those definitions instead of hard-coding them.

## DPRP recognition evaluation

**Try it:** [seanrodriguez.dev/demos/dprp-evaluation](https://seanrodriguez.dev/demos/dprp-evaluation)

A synthetic organization's participant records, evaluated against the [2024 CDC Diabetes Prevention Recognition Program Standards](https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/dprp-standards.pdf) and, for participants enrolled in Medicare Part B, the Medicare Diabetes Prevention Program ([42 CFR 410.79](https://www.law.cornell.edu/cfr/text/42/410.79)).

- **Recognition over time.**  Every six-month submission is evaluated on the records that existed by its due month, on the cohorts that began 12 to 18 months earlier, and each status carries forward as the Standards allow.
- **Every result with its evidence.**  Eligibility, completion, each risk-reduction pathway and each recognition requirement list what was checked, the values behind it and the section it comes from.
- **Record review.**  Each rule a record breaks becomes a guidance item: what is wrong, the expected and recorded values, how to fix it, and the actions the rule allows.  "Fix this" opens the form at the field; accepting asks for a reason and keeps who and when.
- **Rules delivered to the platform's forms.**  The enrollment and session forms are the platform's own.  Every standard that applies to a participant adds its rules to them, and each field shows which standard asked for what.  Set Medicare Part B to yes and the MDPP's rules join.
- **The submission file.**  Records become Table 5's columns and codes only when the file is made.

## Why it is built this way

Penji started as a data system for one program.  To become a platform, it had to take on a new program, a new standard or a new kind of organization as definitions, with the engines that read them left unchanged.  This structure is how it does that, and it is the architecture Penji's current major version is built on.

Its foundation serves any organization that tracks people or things over time against a standard: tenants and their hierarchy, registrations, longitudinal records, compliance checks, and role-based access.  A second demo is being built on the same packages: a tug and barge fleet's supply requests, vessel profiles and maintenance, with vessels and crews where the cohorts and participants are.

### How it got here

- **2018:** Benji, built in Google Sheets and Apps Script, took 11 organizations from paper to digital.  It was version 0, where the workflows took shape.
- **2019 to 2020:** The web rebuild began in React and moved to Angular.
- **May 2025:** The current Penji repository began.
- **Early 2026:** Penji had grown its own abstraction ladder: implementation code at the bottom, meta-primitives above it (forms, workflows and contexts as configuration), and a self-describing schema at the top.
- **Feb to Mar 2026:** I recognized that ladder in the OMG Meta Object Facility and adopted the standard's layers, names and rules.  Repository inheritance gave way to definitions.

The layering grew out of the work.  The standard gave it names and rules other engineers already know.

## Architecture

The repository follows the four layers of the OMG Meta Object Facility.  Each layer is described by the one above it, and code at each layer reads the layer above instead of repeating it.

| Layer | What it is | Where it lives |
|---|---|---|
| M3, meta-metamodel | What a definition is: a kind, an ID, a version and the source it was written from | `packages/types/src/definitions/definition.ts` |
| M2, metamodels | The shape of each kind of definition: a compliance standard, a rule, a criterion, a requirement and tier, a form, a data element, a guidance item | `packages/types/src/definitions/` |
| M1, models | Definitions in those shapes: the 2024 DPRP Standards, the MDPP regulation, the platform's enrollment and session forms | `packages/dprp-standard/`, `packages/mdpp-standard/`, `packages/program-records/` |
| M0, instances | An organization's records and the resolutions people record | `packages/types/src/records/` (shapes), `packages/seed/` (synthetic data) |

### Packages

- **`@penji-demos/constants`:** every fixed value: MOF layers, rule kinds, severities, guidance actions, canonical field names, metric keys, DPRP codes and submission columns.
- **`@penji-demos/types`:** branded IDs, the M3 and M2 definitions, the M0 records and the evaluation results.
- **`@penji-demos/time`:** calendar dates and program months.
- **`@penji-demos/form-engine`:** renders and validates any form definition, and evaluates conditions.
- **`@penji-demos/compliance-engine`:** evaluates any compliance standard's eligibility and rules over a participant's facts and session history, merges the active standards' rules onto a form with the source of each, and turns findings into guidance items.
- **`@penji-demos/rule-engine`:** evaluates requirement definitions against a registry of metric calculators, awards tiers, and carries awarded statuses forward.
- **`@penji-demos/program-records`:** the platform's own enrollment and session forms and the adapters between records, facts and form answers.
- **`@penji-demos/dprp-standard`:** the 2024 Standards as data, its data dictionary, the recognition evaluation and the submission file.
- **`@penji-demos/mdpp-standard`:** 42 CFR 410.79(c)(1) eligibility as data.
- **`@penji-demos/seed`:** a deterministic synthetic organization with a case for every rule.

### Decisions

- **Standards are data, delivered to the platform.**  A standard says who it applies to, who it accepts and what a record must hold.  The records and forms keep their own shape; the compliance engine brings each standard's rules to them.  Adding the MDPP took a definition and no engine change.
- **One condition language.**  The same conditions decide when a form question shows, when a rule applies and whether an eligibility criterion holds.
- **The engines never see the domain.**  The compliance and rule engines are tested on made-up domains (a swim program, a gold-silver-bronze standard).  Requirements name metric keys, and a registry maps each to its calculator; a drift test fails if the two fall out of step.
- **Evidence over verdicts.**  Every determination lists what was checked and the values behind it.  A metric with no data is unmeasured, never a measured zero.
- **Store canonical, morph on export.**  Records hold facts in plain terms (`weightPounds: null`, `fastingGlucoseMgDl: 105`).  The DPRP's codes (`WEIGHT 999`, `GLUCTEST 1`, `SESSTYPE MU-CM`) are worked out from the DPRP's own definitions when the file is made.
- **Each submission sees its own past.**  Evaluations use only the records that existed when a submission was due.
- **Ambiguous text is read out loud.**  Where a source leaves room, the reading is written into the definition's `interpretations` and shown on the page.
- **Five verbs.**  Functions `validate` data against a constraint, `evaluate` a definition against evidence, `resolve` a context to a concrete artifact, `calculate` numbers, or answer `is`.

Out of scope here, and in Penji: automatic corrections, dismissing findings, reminders for deferred items, and any server.  Everything on the page runs in the browser on synthetic data.

## Run it

```sh
npm install
npm run test:packages   # the packages' tests (Vitest)
npm start               # http://localhost:4200
npm run build:site      # production build for seanrodriguez.dev/demos/dprp-evaluation/
```

## License

MIT
