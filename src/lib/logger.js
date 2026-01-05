const __keilogs = [];

['log', 'info', 'warn', 'error'].forEach((level) => {
  const orig = console[level] && console[level].bind ? console[level].bind(console) : (...args) => {};
  console[level] = (...args) => {
    try {
      const text = args.map((a) => {
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch (e) {
          return String(a);
        }
      }).join(' ');
      __keilogs.push({ level, text, ts: new Date().toISOString() });
      if (orig) orig(...args);
    } catch (e) {
      if (orig) orig(...args);
    }
  };
});

export function getKeiLogs() {
  return __keilogs.slice();
}

export default { getKeiLogs };
