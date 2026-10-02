# Penji demos

Working demonstrations of how I build Penji, my program data platform for community health programs.  Penji's own code is private; these are written fresh, on synthetic data, with the same architecture: one type system shared by every package, constants in one place, standards and forms as definitions, and engines that read those definitions instead of hard-coding them.

## DPRP recognition evaluation

**Try it:** [seanrodriguez.dev/demos/dprp-evaluation](https://seanrodriguez.dev/demos/dprp-evaluation)

A synthetic organization's participant records, evaluated against the [2024 CDC Diabetes Prevention Recognition Program Standards](https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/dprp-standards.pdf) and, for participants enrolled in Medicare Part B, the Medicare Diabetes Prevention Program ([42 CFR 410.79](https://www.law.cornell.edu/cfr/text/42/410.79)).

- **Recognition over time.**  Every six-month submission is evaluated on the records that existed by its due month, on the cohorts that began 12 to 18 months earlier, and each status carries forward as the Standards allow.
- **Every result with its evidence.**  Eligibility, completion, each risk-reduction pathway and each recognition requirement list what was checked, the values behind it and the section it comes from.
- **Record review.**  Each rule a record breaks becomes a guidance item: what is wrong, the expected and recorded values, how to fix it, and the actions the rule allows.  "Fix this" opens the form at the field; accepting asks for a reason and keeps who and when.
- **Rules delivered to the platform's forms.**  The enrollment and session forms are the program's own.  Every standard that applies to a participant adds its rules to them, and each field shows which standard asked for what.  Set Medicare Part B to yes and the MDPP's rules join.
- **The submission file.**  Records become Table 5's columns and codes only when the file is made.

## Fleet supply and maintenance

**Try it:** [seanrodriguez.dev/demos/fleet-supply](https://seanrodriguez.dev/demos/fleet-supply)

A made-up tug and barge company and the shop that keeps its vessels running, on the same engines as the DPRP demo.  Every name is fictional, and every policy is the made-up company's own.

- **Viewing as.**  Pick a person and the page offers what they may do: crew add to their vessel's want list and remove their own items until it is sent, an officer aboard sends it, the shop works it, and the port engineer approves.  Crew off rotation hold nothing.  Every refused action says why.
- **The want list.**  Each item moves through the shop's statuses, from New to Received, and keeps who took each step and when.  Mooring lines and costly items cannot go in the locker until they are approved; the workflow's guard holds them.
- **Record review.**  The supply policy and the maintenance schedule are compliance standards, evaluated on each vessel's profile and every item on its list, with the same guidance, accept-with-a-reason and "Fix this" as the DPRP demo.
- **The configuration, as data.**  Who may do what, how an item moves, what each vessel keeps, and the policies, read back from the definitions the page runs on.

## Two-factor sign-in

**Try it:** [seanrodriguez.dev/demos/totp-sign-in](https://seanrodriguez.dev/demos/totp-sign-in)

Signing in with a code from an authenticator app, the way Penji signs everyone in, with recovery codes for a lost phone.  The page plays both the server and the phone so every step can be watched; in Penji the secret is made and checked on the server.

- **Setup.**  A QR code and a typed key give the authenticator its secret.  The first good code turns the factor on, and ten recovery codes are shown once.  The account keeps only a hash of each.
- **A built-in authenticator.**  It shows the current code and the seconds left in its time step, and its clock can be set behind or ahead.  An authenticator app on a phone, scanning the same QR code, shows the same code.
- **Every check, with its evidence.**  Each code is compared with the current time step and one step either side.  A code from a step already used is refused, and five failures in a row lock sign-in for a minute.  The page lists each step compared, which matched, and the attempt count.
- **The policy, as data.**  Digits, time step, drift, secret length, recovery codes and lockout come from one definition, checked against the bounds RFC 4226 and RFC 6238 set.
- **Tested to the RFCs.**  The factor engine passes the HOTP test values in RFC 4226 appendix D and the TOTP test values for SHA-1, SHA-256 and SHA-512 in RFC 6238 appendix B.

## Why it is built this way

Penji started as a data system for one program.  To become a platform, it had to take on a new program, a new standard or a new kind of organization as definitions, with the engines that read them left unchanged.  This structure is how it does that, and it is the architecture Penji's current major version is built on.

Its foundation serves any organization that tracks people or things over time against a standard: tenants and their hierarchy, registrations, longitudinal records, compliance checks, and role-based access.  The fleet demo runs on the same packages: a tug and barge fleet's supply requests, vessel profiles and maintenance, with vessels and crews where the cohorts and participants are.

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
| M2, metamodels | The shape of each kind of definition: a product configuration, a tenant kind, an entity with its streams and facts, a form, a workflow, an access policy and its role rules, a compliance standard and its rules, a requirement and tier, a data element.  The DPRP adds its own: a recognition standard | `packages/types/src/definitions/`, `packages/dprp-standard/src/definitions/recognition-standard-definition.ts` |
| M1, models | Definitions in those shapes: the diabetes prevention program's configuration, the 2024 DPRP Standards, the MDPP regulation, the fleet's configuration and policies | `packages/dprp-configuration/`, `packages/dprp-standard/`, `packages/mdpp-standard/`, `packages/fleet-configuration/` |
| M0, instances | Tenants, people and their assignments, entities, stream entries, and the resolutions people record | `packages/types/src/records/` (shapes), `packages/dprp-seed/`, `packages/fleet-seed/` (synthetic data) |

### One platform, two products

The engines hold no product.  A product is a configuration bundle: its tenant kinds, the entities it keeps and the streams of dated entries recorded against them, its forms, workflows, access policy and standards.  The diabetes prevention program keeps cohorts and participants, with a session log on each participant.  The fleet keeps vessels, with a want list on each vessel whose items move through a workflow.  The same record engine works out each record's facts, decides who may do what, records every change and hands each record to the same compliance engine.

A person's position gives their roles, through the access policy's role rules: every captain is a crew member and a sending officer, every lifestyle coach a coach.  Their assignments say where the roles apply, and an assignment covers everything beneath it.  A hub's data specialist is assigned at the hub and works every organization under it; the fleet's supply manager works for the shop and is assigned at the owning company, over every vessel.  Crew are assigned to the vessel they rotate aboard, and an assignment is inactive while they are off.

`architecture/platform-boundaries.spec.ts` checks the boundary on every test run:

| Package group | May import |
|---|---|
| Engines: `constants`, `types`, `time`, `form-engine`, `compliance-engine`, `rule-engine`, `workflow-engine`, `record-engine` | Engines only.  Every engine except `constants` names no product value |
| Diabetes prevention program: `dprp-configuration`, `dprp-standard`, `mdpp-standard`, `dprp-recognition`, `dprp-seed` | Engines and its own packages |
| Fleet supply and maintenance: `fleet-configuration`, `fleet-seed` | Engines and its own packages |
| Two-factor sign-in:

- **`@penji-demos/factor-engine`:** HOTP and TOTP over Web Crypto, base 32, the otpauth link, recovery codes and their hashes, setup, and code checks with a drift window, replay refusal and lockout.  The time and the random bytes are handed to it.
- **`@penji-demos/sign-in-configuration`:** the platform's sign-in policy as a definition.

Shared page parts: `ui` | Engines only |

Both products reach the form, compliance, workflow and record engines, and the configuration packages export definitions and no code.

### Packages

Engines:

- **`@penji-demos/constants`:** every fixed value: MOF layers, platform facts, scope and fact kinds, rule kinds, severities, and each product's codes and field names.
- **`@penji-demos/types`:** branded IDs, the M3 and M2 definitions, the platform's records and the compliance and requirement results.
- **`@penji-demos/time`:** calendar dates and program months.
- **`@penji-demos/form-engine`:** renders and validates any form definition, evaluates conditions and calculates fields.
- **`@penji-demos/compliance-engine`:** evaluates any compliance standard's eligibility and rules over a subject's facts and the entries in its streams, merges the active standards' rules onto a form with the source of each, and turns findings into guidance items.
- **`@penji-demos/rule-engine`:** evaluates requirement definitions against a standard's registry of metric calculators, awards tiers, and carries awarded statuses forward.
- **`@penji-demos/workflow-engine`:** checks permissions against an access policy and moves a record through any workflow definition.
- **`@penji-demos/record-engine`:** reads any configuration's tenants, entities and streams: works out facts, resolves each person's roles from their record and who may do what over the tenant and entity trees, records changes with a permission check on each, shows the records as of a date, and validates a configuration bundle.

Diabetes prevention program:

- **`@penji-demos/dprp-configuration`:** the program as configuration: hub and organization tenants, cohorts and participants, the session, A1C result and recode streams, the forms, and the access roles with the positions that hold them.
- **`@penji-demos/dprp-standard`:** the recognition standard's shape, and the 2024 Standards and the Table 5 data dictionary as data.
- **`@penji-demos/mdpp-standard`:** 42 CFR 410.79(c)(1) eligibility as data.
- **`@penji-demos/dprp-recognition`:** the DPRP's metric calculators, the shapes of its results, recognition over the submissions, and the submission file.
- **`@penji-demos/dprp-seed`:** a deterministic synthetic hub and organization with a case for every rule.

Fleet supply and maintenance:

- **`@penji-demos/fleet-configuration`:** a made-up tug and barge company's fleet as configuration: companies, vessels, the want list and its workflow, the forms, the access policy with the positions that hold each role, the supply policy and the maintenance schedule.
- **`@penji-demos/fleet-seed`:** a deterministic synthetic fleet with a case for every policy rule.

Shared page parts:

- **`@penji-demos/ui`:** the site's header, footer and theme, the definition-driven form, the guidance list and the standards explorer.

### Decisions

- **Standards are data, delivered to the platform.**  A standard says who it applies to, who it accepts and what a record must hold.  The records and forms keep their own shape; the compliance engine brings each standard's rules to them.  Adding the MDPP took a definition and no engine change.
- **One condition language.**  The same conditions decide when a form question shows, when a rule applies and whether an eligibility criterion holds.
- **The engines never see the domain.**  Each engine is tested on a made-up domain of its own: a swim program, a tool library, a newsroom, a gold-silver-bronze standard.  Requirements name metric keys, and each standard's registry maps them to its calculators; a drift test fails if the two fall out of step.
- **Evidence over verdicts.**  Every determination lists what was checked and the values behind it.  A metric with no data is unmeasured, never a measured zero.
- **Store canonical, morph on export.**  Records hold their values in plain terms (`weightPounds: null`, `fastingGlucoseMgDl: 105`).  The DPRP's codes (`WEIGHT 999`, `GLUCTEST 1`, `SESSTYPE MU-CM`) are worked out from the DPRP's own definitions when the file is made.
- **Each submission sees its own past.**  Evaluations use only the records that existed when a submission was due.
- **Ambiguous text is read out loud.**  Where a source leaves room, the reading is written into the definition's `interpretations` and shown on the page.
- **Five verbs.**  Functions `validate` data against a constraint, `evaluate` a definition against evidence, `resolve` a context to a concrete artifact, `calculate` numbers, or answer `is`.

Out of scope here, and in Penji: automatic corrections, dismissing findings, reminders for deferred items, and any server.  Everything on the page runs in the browser on synthetic data.

## Run it

```sh
npm install
npm run test:packages   # the packages' tests (Vitest)
npm start               # the DPRP demo, http://localhost:4200
npm run start:fleet     # the fleet demo, http://localhost:4200
npm run build:site      # production build for seanrodriguez.dev/demos/dprp-evaluation/
npm run build:fleet-site  # production build for seanrodriguez.dev/demos/fleet-supply/
npm run start:totp      # the sign-in demo, http://localhost:4200
npm run build:totp-site # production build for seanrodriguez.dev/demos/totp-sign-in/
```

## License

MIT
