var PORT = process.env.PORT || 3000;

var path = require('path');
var express = require('express');
var workway = require('workway/node').authorize(
  path.resolve(__dirname, 'workers')
);

var app = workway.app(express());
app.get('/', function (req, res) {
  res.writeHead(200, 'OK', {
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.end(require('fs').readFileSync(path.resolve(__dirname, 'index.html')));
});
app.listen(PORT, () => {
  console.log('listening on http://localhost:' + PORT);
});
