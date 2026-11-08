// Back and forward through the places this window has been, as VS Code's ⌘[ and ⌘]. A place is a plain object
// ({ spaces, view, task, file, line, … }); app.js says what the current one is and whether an old one still exists.
// In memory only: a restart starts afresh, and each window keeps its own.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// A few lines on in the same file isn't a new place (VS Code's rule): it replaces the step instead of adding one.
const near = (a, b) => {
  const { line: x, ...restA } = a;
  const { line: y, ...restB } = b;
  return same(restA, restB) && (x == null || y == null || Math.abs(x - y) <= 10);
};

export function createHistory(max = 50) {
  let steps = [];
  let at = -1;
  // The nearest step that way which still exists and isn't where we already are, or -1.
  const find = (dir, exists) => {
    for (let i = at + dir; i >= 0 && i < steps.length; i += dir) if (!same(steps[i], steps[at]) && exists(steps[i])) return i;
    return -1;
  };
  return {
    // A new place drops the steps ahead, as a browser does. The same place twice counts once.
    record(place) {
      if (at >= 0 && near(steps[at], place)) steps[at] = place;
      else {
        steps = [...steps.slice(0, at + 1), place].slice(-max);
        at = steps.length - 1;
      }
    },
    can: (dir, exists = () => true) => find(dir, exists) >= 0,
    // Where we are, to come back to (reset) when no step that way could be restored.
    mark: () => at,
    reset(i) { at = i; },
    go(dir, exists = () => true) {
      const i = find(dir, exists);
      if (i < 0) return null;
      at = i;
      return steps[i];
    },
  };
}
