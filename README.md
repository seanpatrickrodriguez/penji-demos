# Penji demos

Working demonstrations of how I build Penji, my program data platform for community health programs.  Penji's own code is private; these are written fresh, on synthetic data, with the same architecture: one type system shared by every package, constants in one place, standards and forms as definitions, and engines that read those definitions instead of hard-coding them.

## DPRP recognition evaluation

Evaluates an organization's participant records against the [2024 CDC Diabetes Prevention Recognition Program Standards](https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/dprp-standards.pdf): who is eligible, who completed, who reduced their risk, which cohorts a submission is evaluated on, and the recognition the records support.  Every result carries the evidence behind it, and every rule traces to the section of the Standards it comes from.

## Architecture

The repository follows the four layers of the OMG Meta Object Facility.  Each layer is described by the one above it, and code at each layer reads the layer above instead of repeating it.

| Layer | What it is | Where it lives |
|---|---|---|
| M3, meta-metamodel | What a definition is: a kind, an ID, a version and the source it was written from | `packages/types/src/definitions/definition.ts` |
| M2, metamodels | The shape of each kind of definition: a standard, a requirement, a data element, a form | `packages/types/src/definitions/` |
| M1, models | Definitions written in those shapes: the 2024 DPRP Standards, its data dictionary, the session form resolved from that dictionary | `packages/dprp-standard/src/definitions/` |
| M0, instances | An organization's records: cohorts, participants, sessions | `packages/types/src/records/` (shapes), `packages/seed/` (synthetic data) |

### Packages

- **`@penji-demos/constants`:** every fixed value: the MOF layers, definition kinds, metric keys, DPRP codes (session types, delivery modes, prediabetes determinations, the 999 sentinels) and submission columns.  No other package declares one.
- **`@penji-demos/types`:** the one type system: branded IDs, the M3 and M2 definitions, the M0 record shapes and the evaluation results.  Every package and the app import from here.
- **`@penji-demos/time`:** calendar dates and program months.  "Months 1-6", "9 full months" and "the beginning of the 4th month" are defined here once, with boundary tests.
- **`@penji-demos/rule-engine`:** evaluates any set of requirement definitions against a registry of metric calculators and awards the highest tier whose requirements hold.  It has no knowledge of the DPRP.
- **`@penji-demos/dprp-standard`:** the 2024 Standards as an M1 definition, the data dictionary, the participant and organization evaluations, the metric registry, and the export to the DPRP's submission columns.
- **`@penji-demos/form-engine`:** renders and validates any form definition.  The session form is resolved from the data dictionary, so its limits are the dictionary's limits.
- **`@penji-demos/seed`:** a deterministic synthetic organization.

### Decisions

- **The standard is data.**  Thresholds, windows, outcome pathways, requirements and recognition tiers live in `DPRP_STANDARD_2024`.  A test evaluates the same records under a second, hypothetical edition and gets a different result with no engine change.
- **The engine never sees the domain.**  Requirements name metric keys; a registry maps each key to the function that calculates it.  A registry-drift test fails if the standard names a metric with no calculator or the registry holds one the standard never uses.
- **Store canonical, morph on export.**  Records are stored readable (`weightPounds: null`, `isMakeUp: true`).  The DPRP's column names and codes (`WEIGHT 999`, `SESSTYPE MU-C`) are applied only when the submission file is made.
- **Evidence over verdicts.**  Each determination lists the criteria checked, whether each held and the values behind it.  A metric with no data is unmeasured, never a measured zero.
- **Ambiguous text is read out loud.**  Where the Standards leave room (how to average 150 minutes a week, which weights count, where a month starts), the reading is written into the definition's `interpretations` and shown on the page.
- **Five verbs.**  Functions `validate` data against a constraint, `evaluate` a definition against evidence, `resolve` a context to a concrete artifact, `calculate` numbers, or answer `is`.

## Run it

```sh
npm install
npm test             # package tests (Vitest), then the app's
npm start            # http://localhost:4200
```

## License

MIT
