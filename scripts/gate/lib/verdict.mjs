// The release gate's verdict (release-gate.mjs). INVALID is for drops that missed while the machine was over its
// load limit, and nothing else: a break-it scenario that failed, a run where nothing ran, a cell lost from the last
// green run, and a board that's too small are RED whatever the load.
export function verdictOf({ drops = false, other = false, size = false, peak = 0, max = Infinity } = {}) {
  if (!drops && !other && !size) return 'green';
  return drops && !other && !size && peak > max ? 'invalid' : 'red';
}

// A state in the unhappy gate (unhappy.mjs) fails when it couldn't be staged, threw, failed one of the four checks,
// or (unless softContrast) had text below WCAG AA or contrast that couldn't be measured: a measuring error is never
// a quiet pass. -no-contrast leaves contrast and contrastError unset, so nothing is held to it.
export function stateFails(r, { softContrast = false } = {}) {
  if (r.skip || r.error || !r.pass) return true;
  if (softContrast) return false;
  return !!r.contrastError || !!(r.contrast && r.contrast.length);
}
export function stateWhy(r) {
  const why = (r.why || []).slice();
  if (r.contrast && r.contrast.length) why.push('contrast below AA on ' + r.contrast.length + ' text' + (r.contrast.length === 1 ? '' : 's'));
  if (r.contrastError) why.push('contrast couldn’t be measured: ' + r.contrastError);
  return why;
}
