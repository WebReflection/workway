const util = require('util');

const workway = require('workway');

function foo(message, callback) {
    callback(42); // forcing always an error
}

const fooPromisified = util.promisify(foo);

workway({
    fooPromisified
});
