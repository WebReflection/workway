importScripts('https://unpkg.com/workway/worker.js');

workway({
  analyze(circular) {
    return circular;
  }
});
