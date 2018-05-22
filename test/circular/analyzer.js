importScripts(
  'https://unpkg.com/workway/worker.js',
  'https://unpkg.com/flatted'
);

workway({
  analyze(circular) {
    const data = Flatted.parse(circular);
    return 'OK';
  }
});
