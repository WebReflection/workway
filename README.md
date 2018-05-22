# workway [![Build Status](https://travis-ci.org/WebReflection/workway.svg?branch=master)](https://travis-ci.org/WebReflection/workway) [![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

A general purpose, Web Worker driven, remote namespace with classes and methods.


## Example
A basic **firebase.js** client to show the user name.
```js
workway('/workers/firebase.js').then(
  async function ({worker, namespace}) {
    await namespace.initializeApp({
      apiKey: "<API_KEY>",
      authDomain: "<PROJECT_ID>.firebaseapp.com",
      databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
      projectId: "<PROJECT_ID>",
      storageBucket: "<BUCKET>.appspot.com",
      messagingSenderId: "<SENDER_ID>"
    });
    const fb = new namespace.FirebaseUser();
    const name = await fb.name();
    console.log(name); // will log the user name, if any

    // the worker can be regularly used like any other worker
    worker.postMessage('all good');
  }
);
```

The **workers/firebase.js** worker that exposes some info.
```js
// top import to ensure a transparent communication channel
importScripts('https://unpkg.com/workway/worker.js');

// any other needed import for this worker
importScripts(...[
  'app', 'auth', 'database', 'firestore', 'messaging', 'functions'
].map(name => `https://www.gstatic.com/firebasejs/5.0.1/firebase-${name}.js`));

// expose a namespaces as an object
// with any sort of serializable value
// and also methods or classes
workway({

  // any serializable data is OK (nested too)
  timestamp: Date.now(),

  // methods are OK too, each method
  // accepts serializable arguments and
  // can return a value and/or a promise
  initializeApp(config) {
    firebase.initializeApp(config);
  },

  // classes are also fine, as long as
  // these respect RemoteClass convetions
  FirebaseUser: class FirebaseUser {
    constructor() {
      this.uid = firebase.auth().currentUser.uid;
    }
    name() {
      return firebase.database()
                .ref('/users/' + this.uid)
                .once('value')
                .then(snapshot => ((
                  snapshot.val() && snapshot.val().username
                ) || 'Anonymous'));
    }
  }
});

// this worker can be regularly used like any other worker
// the passed event will never be one handled by `workway`
self.onmessage = event => {
  console.log(event.data);
};
```


## The RemoteClass convention

Classes exposed through `workway` namespace must follow these rules:

  * no constructor arguments; use methods to eventually forward extra details from the client
  * methods can accept only serializable arguments and can return either a serializable value or a promise that will resolve as serializable data
  * properties set on the **client** side must be serializable and will be **reflected** into related worker instances whenever methods are invoked
  * properties set in the **worker** will **not** be **reflected** on the client side so that what's defined in the worker, stays in the worker
  * every method invocation returns a Promise, even if the method returned value is not
  * multiple methods invocation at once are possible, but there is no guarantee of the order. Use promises features or `await` each call if sequential methods calls depend on previous results.


## Compatibility

The code is written in a ES5 friendly syntax, and it's guaranteed to work in IE 10 or above, and mostly every mobile browser.

However, in IE 10/11 case, you need to provide polyfills on both client and worker side, right before this script.

Feel free to choose the one you prefer, following just as example:

```html
<!doctype html>
<script>
// needed for IE11
if(!this.Promise)document.write('<script src="https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js"><'+'/script>');
// needed for IE10
if(!this.WeakMap)document.write('<script src="https://unpkg.com/poorlyfills@0.1.1/min.js"><'+'/script>');
</script>
<script src="https://unpkg.com/workway"></script>
<script src="firebase.js"></script>
```

Or on top of your generic worker.
```js
// import the polyfill you prefer for either IE11 or IE10
if (!self.Promise) importScripts('https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js');
if (!self.WeakMap) importScripts('https://unpkg.com/poorlyfills@0.1.1/min.js');

// now import workway/worker.js before any other worker script
importScripts('https://unpkg.com/workway/worker.js');

// ... the rest of the code ... 
```

You can test live your browser through the [live test page](https://webreflection.github.io/workway/test/index.html).


### Extra Info

  * the client side of this package fits in just 100 LOC
  * the client side of this project weights 0.5K via brotli, 0.6K via gzip
  * the client side source of truth of this project is its root `./index.js`
  * the only worker related code is in `./worker.js` root file
  * the ESM version of this module is in `esm/index.js`
  * the CJS version of this module is in `cjs/index.js`
  * the browser version of this module is in `min.js`
