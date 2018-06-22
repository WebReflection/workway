const path = require('path');
const express = require('express');
const workway = require('workway/node');

// which folder should be reachable from the Web ?
workway.authorize(path.join(__dirname, 'workers'));

// create an app through workway
const app = workway.app(express());
app.use(express.static(path.join(__dirname, 'www')));
app.listen(process.env.PORT || 8080, function () {
  console.log(`http://localhost:${this.address().port}/`);
});
