# Smart breakdowns (Oct 14, 2026)

Claude suggests a to-do's steps with a time on each, or a goal's parts with hours, when the board's own library doesn't know it. It's the third way in the Intelligence section of [PRODUCT-STRATEGY.md](PRODUCT-STRATEGY.md): optional, on the web, behind a clear opt-in. The built-in steps (`Model.breakdown`, `Model.goalForExam`) always come first and never wait on it.

The model is Claude Haiku 5.5 (`claude-haiku-5-5`). It's built and tested, and it stays off until a key is added to the Vercel project (below).

## What it does

- **To-dos.** The to-do panel's Smarter steps button asks Claude for steps when the built-in ones don't fit. Claude's steps follow the same rules as the board's own: plain actions in order, a time on each in 5 minute steps from 5 to 240, the first one 10 minutes or less (a longer first step splits off its first 10, the way `Model.breakdown` does), and Smaller or Bigger steps (`size`: small, medium, big).
- **Goals.** The Goals screens ask for a goal's parts (subjects, chapters, milestones) with the hours each usually takes, and a one sentence note on the estimate, like "About 300 hours is a common estimate." When the date leaves less time than the goal usually takes, the note says so.
- **Words.** Everything Claude writes is cleaned to the board's voice before anyone sees it: no em dashes, en dashes, or double hyphens, none of the filler words (just, simply, really, please, actually), sentence case, names cut at a word to 60 characters.

## Private by default

- **Off until it's turned on, on each device.** The first time someone asks, a sheet says what it does, exactly what's sent, that nothing else leaves, and who processes it, with a link to the privacy policy, and Turn on or Not now. The choice is kept on the device (`localStorage` key `sundayreset.ai`), never on the board, so it doesn't travel with a backup or to the household. On a made up board (a preview or a Dev scenario) it's held in memory and let go after.
- **What's sent:** the words of the one to-do or goal asked about, and the step size or the goal's date. Nothing else: no other to-dos, days, names, or anything from the board. The server reads only those fields and ignores anything else in a request.
- **Who reads it:** the function at `/api/smart` passes it to Anthropic, which processes it under its API terms. The function keeps nothing and never writes the words or the key to a log; it notes only what went wrong, like `smart: claude said 529`.
- **Turning it off:** Settings, Smart breakdowns (This device). The overview shows whether it's on.
- **Is it there?** Once a page load, the page asks `GET /api/smart` whether the site is set up, so it knows whether to offer it at all. That request carries nothing from the board.

## How it's built

### The endpoint: `GET` and `POST /api/smart`

`variants/corners11/api/smart.js`, copied by `scripts/make-variants.mjs` to `v/corners11/api/smart.js`, where Vercel runs it as a Node.js function (the Web standard `export default { fetch }` form, which needs no framework and no package.json).

| Ask | Answer |
|---|---|
| `GET` | `200 { ready: true }` when `ANTHROPIC_API_KEY` is set, else `503 { ready: false }` |
| `POST { kind: 'steps', name, size: 'small' \| 'medium' \| 'big' }` | `200 { steps: [{ name, dur }] }`, 1 to 15 steps, `dur` in minutes |
| `POST { kind: 'parts', name, date: 'YYYY-MM-DD' }` | `200 { parts: [{ name, min }], note }`, 1 to 15 parts, `min` from 15 minutes to 500 hours |

Anything else answers `{ error, message }` with one of four errors, so the page can keep its built-in steps:

| `error` | Status | When |
|---|---|---|
| `not_ready` | 503 | No key is set |
| `too_many` | 429, with `Retry-After` | More than 10 a minute or 100 a day from one address |
| `bad_request` | 400, 403, 405, 413, 415 | A name that's empty, over 140 characters, or has a control character; a size or kind not on the list; a date that isn't a day; not JSON; over 2 KB; another site's page (403) |
| `upstream` | 502, or 504 after 15 seconds | Claude didn't answer, refused, or answered in a shape that doesn't fit |

How it asks Claude: one Messages API request (`POST https://api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`) with `model: 'claude-haiku-5-5'`, `max_tokens: 800`, a short system prompt in Russell's voice, and one tool (`give_steps` or `give_parts`, `strict: true`) forced with `tool_choice`, so the answer comes back as data, not prose. Haiku 5.5 skips thinking on a forced tool call, so the 800 tokens all go to the answer. No sampling settings are sent (Haiku 5.5 refuses them). The answer is used only when it stopped on the tool call; a refusal or a cut off answer is `upstream`.

Guards:

- **Only its own page.** A `POST` needs an `Origin` that matches the host it was sent to, so another site can't spend it from its visitors' browsers. A page on this computer may ask a server on this computer, for trying it while developing. It also needs `content-type: application/json`, which makes a browser on another site ask first, and this function never says yes.
- **How often.** About 10 a minute and 100 a day for each address, counted in the function's memory. Vercel keeps an instance warm between requests, so this holds for a run of asks, but a new instance starts counting again: it's a speed bump, not a wall. The spend limit in the Anthropic Console is the wall.
- **How long.** 15 seconds, on the server and in the page.

### The client: `window.SR_ai`

In `variants/corners11/variant.js`, the section `/* == V11: smart breakdowns == */` at the end, so only V11 has it. Its styles are `variants/corners11/css/ai.css`.

```
SR_ai.ready()        the server is set up (asked once a page load; false until it answers)
SR_ai.available()    ready, and turned on on this device
SR_ai.enable(fn, { kind })
                     on already: fn() now. Otherwise the sheet (kind 'parts' words it for a goal);
                     Turn on keeps the choice and calls fn. Gives a Promise of whether it's on.
                     { sheet: false } is for Settings, whose page says the same things.
SR_ai.disable()      off on this device
SR_ai.breakdown(name, { size })
                     a Promise of { steps: [{ name, dur }], total, source: 'claude' } or null
SR_ai.goalParts(name, { date })
                     a Promise of { parts: [{ name, min }], note, total, source: 'claude' } or null
SR_ai.lastError()    what the last ask that settled as null ran into: { code, message }, or null
```

- Every ask settles within 15 seconds, and anything that went wrong or came back odd settles as `null`. A screen keeps what it had and can say why with `lastError().message`.
- Nothing from the server is used until it passes the page's own checks: 1 to 15 steps, each 5 to 240 minutes on the 5 minute grid, names cut to 60 characters with no dashes or filler words left in, and a first step of 10 minutes or less. Parts are 15 minutes to 500 hours each.
- The same ask (the name, and its size or date) is answered once a page load; `{ fresh: true }` asks again. A window event, `sr-ai`, fires when the server answers ready or the switch changes.
- If the server says `not_ready` (the key was taken away), `ready()` turns false and the feature stops being offered.

Using it from a screen:

```js
const ai = window.SR_ai;
if (ai && ai.ready()) {
  // a Smarter steps button; the built-in steps are already showing
  ai.enable(() => ai.breakdown(todo.name, { size }).then((r) => { if (r) showSteps(r.steps); else keepBuiltIn(ai.lastError()); }));
}
```

### Settings

A page called Smart breakdowns in This device (`SET_PAGES` id `smart`, `needs: 'ai'`, scope device), shown only in V11 and only once `SR_ai.ready()`: the switch, one line on what it sends, and Read the privacy policy. The overview's This device list has a row for it, and Find a setting knows it (claude, ai, steps, privacy). Turning it on there asks nothing more, since the page says what the sheet would.

### Files

- `variants/corners11/api/smart.js`: the function
- `scripts/make-variants.mjs`: copies `variants/<id>/api` to `v/<id>/api` when the folder exists
- `variants/corners11/variant.js`: the client, `window.SR_ai`, and its sheet
- `variants/corners11/css/ai.css`: the sheet and the link
- `board/src/app.js`: the Settings page, its overview row, and its Find a setting line, all behind `FEEL`
- `tests/ai-smart.test.mjs`: the function with a stand in for Claude, and the client cut out of `variant.js`

## What it costs

Claude Haiku 5.5 is $0.10 per million tokens in and $0.50 per million out (for prompts under 100,000 tokens; these are under 2,000).

A typical person in a month: 20 breakdowns at about 700 tokens in and 250 out, and 2 goal plans at about 1,000 in and 800 out.

| | In | Out | Cost |
|---|---|---|---|
| 20 breakdowns | 14,000 | 5,000 | $0.0014 + $0.0025 = $0.0039 |
| 2 goal plans | 2,000 | 1,600 | $0.0002 + $0.0008 = $0.0010 |
| A month | 16,000 | 6,600 | about $0.005 |

So about half a cent a person a month, and about $49 a month for 10,000 people. Budget about $0.007 a person, $66 a month for 10,000, for headroom: the counts are estimates, and Haiku 5.5's tokenizer counts about 30 percent more tokens for the same text than older models. The most one ask can cost is about $0.0005 (1,000 in, 800 out), so one address at its daily limit of 100 costs at most about 5 cents a day.

Vercel bills the function's time too; at a second or two per ask it's well inside the free allowance at this scale.

## Turning it on (Russell)

1. **Update the privacy policy first.** The policy at https://sunday-reset-site.vercel.app/privacy says nothing from the board is sent to a server and doesn't name Anthropic. Add the section below (or your own version), and change "None of this is sent to a server" to say except what you choose to send with Smart breakdowns. Before publishing, check Anthropic's current commercial terms and data retention for the API, link them, and make sure the policy's line about AI training still holds.
2. **Create an API key.** In the Anthropic Console, under API keys, create a key. Name it `sunday-reset-corners-v11`, so it's easy to find and revoke. Copy it once; the Console won't show it again. Don't paste it anywhere but Vercel.
3. **Set a monthly spend limit** in the Console's limits for the workspace the key belongs to, for example $20 a month. That's the wall behind the per address limits.
4. **Add the key to Vercel.** In the Vercel project `sunday-reset-corners-v11`: Settings, Environment Variables, Add. Key `ANTHROPIC_API_KEY`, value the key, environment Production only, marked Sensitive. Save.
5. **Redeploy.** A new environment variable reaches only new deployments: Deployments, the latest production deployment, Redeploy. The deployment has to include `v/corners11/api/smart.js`, so it must be from a build made with `node scripts/make-variants.mjs corners11` after this change.
6. **Check it.** Open https://sunday-reset-corners-v11.vercel.app/api/smart: it should say `{"ready":true}`. In the app, Settings shows Smart breakdowns under This device, and a to-do's Smarter steps asks first, then suggests.

Preview deployments don't get the key (Production only), so they show no smart breakdowns, which is what you want.

### A section for the privacy policy (a draft)

> **Smart breakdowns (optional, off until you turn it on).** If you turn on Smart breakdowns on a device and then ask for steps for a to-do or parts for a goal, the words of that one to-do or goal, with the step size or the goal's date, go from your browser to Sunday Reset's server and on to Anthropic, the company that makes Claude, which writes the suggestion. Nothing else from your board is sent. Sunday Reset's server doesn't store or log those words. Anthropic processes them under its commercial terms [link]. The request, like any request to the site, carries your IP address, which the server holds in memory for a day to limit how often one address can ask, and doesn't store. You can turn Smart breakdowns off any time in Settings.

## Turning it off

- **For good:** remove `ANTHROPIC_API_KEY` from the Vercel project and redeploy. `GET /api/smart` answers `ready: false`, and on the next page load the switch, the Settings page, and the Smarter steps button are gone. A page already open gets `not_ready` on its next ask, stops offering it, and keeps its built-in steps.
- **Right away:** revoke the key in the Anthropic Console. Every ask then fails as `upstream` and the page keeps its built-in steps, but the button still shows until the key is removed from Vercel and the site redeployed.
- **For one person:** Settings, Smart breakdowns, off. Nothing is sent from that device again until it's turned back on.

## Trying it

- `node --test tests/ai-smart.test.mjs` runs the function with a stand in for Claude (no network, a made up key): ready and not ready, every kind of bad ask, the origin check, the limits, the exact request to Claude, good and bad answers, the 15 second wait, and that neither the words nor the key reach a log. It also runs the page's client with stand ins for the browser: nothing is sent until it's on, then only the words; the sheet; the checks; and a made up board.
- In a browser: build with `MV_OUT=<folder> node scripts/make-variants.mjs corners11`, then serve the folder with a small node server that sends `/api/smart` to `makeHandler({ env: { ANTHROPIC_API_KEY: 'made-up' }, fetch: <a stand in that answers with a tool call> })` from the function. The static server (`scripts/serve-board.mjs`) answers 404 there, so the feature stays hidden, which is the not ready path.
