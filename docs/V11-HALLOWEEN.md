# Corners V11 Halloween (Oct 31, 2026)

V11-2 with the Stageshow audit built in. Stageshow is Benji Taylor's agent skill for faux product UI (https://benji.org/stageshow, source `benjitaylor/skills`, folder `stageshow`). The audit is https://claude.ai/artifact/DgLBGJnimxaPeSup3yvNFa: 20 findings across the welcome (W1 to W4), the setup (T1 to T4), the coach (C1 to C3), the desk's motion (D1, D2, and four decisions), and the marketing site (S1 to S5).

## How it's built

`node scripts/make-variants.mjs corners11-halloween` builds `v/corners11-halloween` from the same source as V11-2 (`board/src`, `variants/corners11`). The page carries the class `v-corners11-halloween`; everything this round changes waits behind `HW` (app.js, scene.js) or CSS scoped to `.v-corners11-halloween`, in `variants/corners11/css/hw-*.css`. V11-2 builds as it did.

## What changed
