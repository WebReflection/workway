var PORT = process.env.PORT || 3000;

var path = require('path');
var express = require('express');
var workway = require('../node').authorize(
  path.resolve(__dirname, 'workers')
);

var app = workway.app(express());
app.get('/', function (req, res) {
  res.writeHead(200, 'OK', {
    'Content-Type': 'text/html'
  });
  res.end(require('fs').readFileSync(path.resolve(__dirname, 'node.html')));
});
app.get('/workway.js', function (req, res) {
  res.writeHead(200, 'OK', {
    'Content-Type': 'text/html'
  });
  res.end(require('fs').readFileSync(path.resolve(__dirname, '..', 'index.js')));
});
app.listen(PORT, () => {
  console.log('listening on http://localhost:' + PORT);
});
