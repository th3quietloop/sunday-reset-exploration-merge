/* Things that open over the calendar: a block's sheet, the Sunday Reset, and what this is. */
import * as M from './model.js';
import { KINDS, kindOf, CATS, CAT_ORDER } from './data.js';
import { esc, mark, look, styleVars, chipBrick } from './ui.js';
import { app } from './app.js';
import { dayBar, resetWeek, dueWords } from './views.js';

const MARKS = ['star', 'heart', 'dumbbell', 'runner', 'shoe', 'book', 'brush', 'note', 'laptop', 'people', 'handset', 'chat', 'cup', 'pot', 'fork', 'cart', 'broom', 'shirt', 'car', 'plane', 'moon', 'sun', 'bed', 'leaf', 'tree', 'cake', 'gift', 'film', 'gamepad', 'wrench', 'tooth', 'envelope', 'calendar', 'house', 'wave', 'drop'];

/* == a block's sheet == */
export function sheet() {
  const s = app.v.sheet;
  if (!s) return '';
  const day = M.dayOf(app.st, s.date);
  const b = day.blocks.find((x) => x.id === s.id);
  if (!b) return '';
  const L = look(b);
  const td = b.todo ? app.st.todos.find((x) => x.id === b.todo) : null;
  return `<aside class="sheet" role="dialog" aria-label="${esc(b.name)}" data-sheet>
    <div class="sheet-top"><span class="kick">${M.dayName(s.date)}, ${M.monthName(s.date, true)} ${M.dayNum(s.date)}</span><button class="sq ghost" data-act="closesheet" aria-label="Close">${mark('x', '#1a1a1a')}</button></div>
    <div class="preview brick big ${b.fixed ? 'locked' : ''}" style="${styleVars(L)}">
      <span class="socket">${mark(b.icon || 'star', L.ink)}</span>
      <span class="hero-words"><span class="hero-nm">${esc(b.name)}</span><span class="hero-tm">${M.clock(b.start)} to ${M.clock(b.start + b.dur)}</span></span>
      ${b.fixed ? `<span class="lock">${mark('lock', L.ink)}</span>` : ''}
    </div>
    <label class="field"><span>Name</span><input data-fk="sheet-name" data-edit="name" value="${esc(b.name)}" autocomplete="off"></label>
    <div class="steppers">
      ${stepper('Starts', M.clock(b.start), 'earlier', 'later', b.fixed)}
      ${stepper('Length', M.span(b.dur), 'shorter', 'longer', false)}
    </div>
    <div class="field"><span>Color</span><div class="swatches" role="radiogroup" aria-label="Color">${CAT_ORDER.map((c) => `<button role="radio" aria-checked="${b.cat === c}" class="sw ${b.cat === c ? 'on' : ''}" style="--c:${CATS[c].base}" data-act="cat" data-arg="${c}" title="${esc(CATS[c].name)}"></button>`).join('')}</div></div>
    <div class="field"><span>Mark</span><div class="marks" role="radiogroup" aria-label="Mark">${MARKS.map((m) => `<button role="radio" aria-checked="${b.icon === m}" class="mkb ${b.icon === m ? 'on' : ''}" data-act="icon" data-arg="${m}" title="${m}">${mark(m, '#1a1a1a')}</button>`).join('')}</div></div>
    <button class="toggle ${b.fixed ? 'on' : ''}" data-act="lock" aria-pressed="${!!b.fixed}"><span class="tg"><i></i></span><span><b>Locked</b><span>${b.fixed ? 'It stays put. Other blocks move around it.' : 'Other blocks can push it.'}</span></span></button>
    ${td ? `<button class="toggle ${td.done ? 'on' : ''}" data-act="todone" data-arg="${td.id}" aria-pressed="${!!td.done}"><span class="tg"><i></i></span><span><b>Done</b><span>A to-do${td.due ? `, due ${dueWords(td.due)}` : ''}</span></span></button>` : ''}
    <div class="sheet-acts"><button class="secondary" data-act="focusblock" data-arg="${b.id}" data-date="${s.date}">Focus on this</button></div>
    <hr>
    <button class="danger" data-act="remove">${b.todo ? 'Take it off the day' : 'Remove this block'}</button>
  </aside>`;
}
function stepper(name, value, less, more, off) {
  return `<div class="stepper ${off ? 'off' : ''}"><span class="st-name">${name}</span>
    <button class="sq" data-act="step" data-arg="${less}" ${off ? 'disabled' : ''} aria-label="${name}, ${less}. Now ${value}">${mark(less === 'earlier' ? 'left' : 'minus', '#1a1a1a')}</button>
    <span class="st-val" aria-live="polite">${value}</span>
    <button class="sq" data-act="step" data-arg="${more}" ${off ? 'disabled' : ''} aria-label="${name}, ${more}. Now ${value}">${mark(more === 'later' ? 'right' : 'plus', '#1a1a1a')}</button></div>`;
}

/* == the Sunday Reset == */
const STEPS = ['Kinds', 'To-dos', 'Done'];
export function reset() {
  const r = app.v.reset;
  if (!r) return '';
  const ws = resetWeek();
  const t = M.todayIso();
  const days = Array.from({ length: 7 }, (_, i) => M.addDays(ws, i)).filter((d) => d >= t);
  let body = '';
  if (r.step === 0) {
    body = `<h2>What kind of day is each one?</h2>
      <div class="rdays">${days.map((d) => {
        const cur = M.kindFor(app.st, d) || 'usual';
        return `<div class="rday"><div class="rname"><b>${M.dayName(d, true)}</b><span>${M.monthName(d, true)} ${M.dayNum(d)}</span></div>
          <div class="rmid">${dayBar(d, true)}<div class="rkinds">${KINDS.filter((k) => k.id !== 'empty').map((k) => `<button class="rk ${k.id === cur ? 'on' : ''}" data-act="kind" data-arg="${d}|${k.id}" aria-pressed="${k.id === cur}" style="--k:${k.color}"><span class="kdot" style="--k:${k.color}"></span>${esc(k.name)}</button>`).join('')}</div></div></div>`;
      }).join('')}</div>`;
  } else if (r.step === 1) {
    const waiting = app.st.todos.filter((x) => !x.done);
    body = `<h2>Give your to-dos a time</h2>
      <div class="rtodos">${waiting.map((td) => {
        const at = M.todoPlace(app.st, td.id);
        return `<div class="rtodo">${chipBrick({ ...td, icon: td.icon || 'check' })}<span class="sub">${M.span(td.dur)}${td.due ? `, due ${dueWords(td.due)}` : ''}</span><span class="grow"></span>${at ? `<span class="landed">${mark('check', '#2f6b3a')}${M.dayName(at.date, true)} ${M.clock(at.block.start)}</span>` : `<button class="txt" data-act="todoplan" data-arg="${td.id}">Find a time</button>`}</div>`;
      }).join('') || '<p class="empty">No to-dos waiting.</p>'}</div>
      ${waiting.some((td) => !M.todoPlace(app.st, td.id)) ? '<button class="secondary" data-act="plantodos">Find times for all</button>' : ''}`;
  } else {
    const open = days.reduce((s, d) => s + M.openMinutes(M.dayOf(app.st, d), d === t ? M.nowMin() : undefined), 0);
    const kinds = days.map((d) => kindOf(M.kindFor(app.st, d) || 'usual'));
    const waiting = app.st.todos.filter((x) => !x.done && !M.todoPlace(app.st, x.id)).length;
    body = `<h2>${waiting ? 'Here’s your week' : 'Your week is set'}</h2>
      <div class="rsum"><div><b>${M.hours(open)}</b><span>open</span></div><div><b>${app.st.todos.filter((x) => !x.done && M.todoPlace(app.st, x.id)).length}</b><span>to-dos with a time</span></div><div><b>${waiting}</b><span>still waiting</span></div></div>
      <div class="rweek">${days.map((d, i) => `<div class="rwd" style="--i:${i}"><span>${M.dayName(d, true)}</span><span class="kbrick" style="--k:${kinds[i].color}">${mark(kindOf(kinds[i].id).icon || 'calendar', kinds[i].ink)}</span><b>${esc(kinds[i].name)}</b></div>`).join('')}</div>`;
  }
  return `<div class="scrim" data-act="closereset"></div>
  <div class="modal reset" role="dialog" aria-modal="true" aria-label="Sunday Reset">
    <div class="modal-top"><span class="kick">Sunday Reset · ${M.monthName(ws, true)} ${M.dayNum(ws)} to ${M.dayNum(M.addDays(ws, 6))}</span><button class="sq ghost" data-act="closereset" aria-label="Finish later">${mark('x', '#1a1a1a')}</button></div>
    <div class="steps">${STEPS.map((s, i) => `<div class="stp ${i < r.step ? 'did' : ''} ${i === r.step ? 'on' : ''}"><i></i><span>${s}</span></div>`).join('')}</div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">${r.step > 0 ? `<button class="txt" data-act="rstep" data-arg="${r.step - 1}">Back</button>` : '<span></span>'}
      ${r.step < 2 ? `<button class="primary" data-act="rstep" data-arg="${r.step + 1}">Next: ${STEPS[r.step + 1]}</button>` : '<button class="primary" data-act="rfinish">Finish</button>'}</div>
  </div>`;
}

/* == what this is == */
export function about() {
  if (!app.v.about) return '';
  return `<div class="scrim" data-act="closeabout"></div>
  <div class="modal about" role="dialog" aria-modal="true" aria-label="What this is">
    <div class="modal-top"><span class="kick">An exploration</span><button class="sq ghost" data-act="closeabout" aria-label="Close">${mark('x', '#1a1a1a')}</button></div>
    <div class="modal-body">
      <h2>A clean room with colorful toys in it.</h2>
      <p>The calm of the clean planner, with the blocks from the desk version. Everything that isn't a block stays black, white, and gray, so the blocks are the part you play with.</p>
      <ul class="keys">
        <li><b>Drag</b> a block to move it. Things make room.</li>
        <li><b>Drag its end</b> to stretch it.</li>
        <li><b>Drop</b> a block into Work and it opens a hole.</li>
        <li><b>Locked</b> blocks never move.</li>
        <li><b>T C D W M Y</b> to move around, <b>B</b> for the Block box, <b>Z</b> to undo.</li>
      </ul>
      <p class="sub">The board is made up (Alex, Sam, and Robin) and stays on this device.</p>
    </div>
  </div>`;
}
