# workway DEPRECATED - See [coincident](https://github.com/WebReflection/coincident#coincidentserver)

A general purpose, Web Worker driven, remote namespace with classes and methods.


- - -

## Announcement: Meet proxied-worker & proxied-node

There is a new, very similar, yet different, project, in case you're looking to simply drive generic Workers instances, or namespaces, from a client/main thread: [proxied-worker](https://github.com/WebReflection/proxied-worker#readme).

It has [a NodeJS counterpart module](https://github.com/WebReflection/proxied-node#readme) too!

The main difference with these projects is:

  * classes have a working constructor
  * heap is automatically cleaned on both client/server
  * it uses *Proxy* and *FinalizationRegistry* so these are not as compatible as *workway* is with legacy browsers

- - -


## Key Features

  * no eval at all, no scope issues, 100% CSP friendly
  * no Proxy at all neither, compatible with IE 10, iOS 8, Android 4.4, BB OS 10, and [every other browser](https://webreflection.github.io/workway/test/)
  * 100LOC client squeezed in about 0.5K once compressed
  * you expose non blocking namespaces to the main thread, not the other way around
  * it **works on NodeJS** too 🎉



## Example <sup><sub>(client side only)</sub></sup>
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

// you can also pass in an existing Worker instance (useful if you're using
// Webpack's worker-loader and don't have access to the output file path):
import Worker from 'worker-loader!./Worker.js';
workway(new Worker()).then(...
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
  // these respect RemoteClass conventions
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

## Example <sup><sub>(NodeJS)</sub></sup>

To have NodeJS driven workers you need the regular client side `workway.js` file, plus `/pocket.io/pocket.io.js` and `/workway@node.js` that are both handled by this module.

```html
<script src="/workway.js">/* regular workway client file */</script>
<script src="/pocket.io/pocket.io.js">/* automatically provided by the server */</script>
<script src="/workway@node.js">/* automatically provided by the server */</script>
```

This is a `js/os.js` file for the client side.
```js
workway('node://os.js').then(({worker, namespace:os}) => {
  os.getNetworkInterfaces().then(console.log);
});
```

Please note the client file needs EventTarget, Promise, and WeakMap constructors.
If your target browsers don't have these features, you can use the following polyfills on top of your HTML file.

```html
<script>
if(!this.Promise)document.write('<script src="https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js"><'+'/script>');
if(!this.WeakMap)document.write('<script src="https://unpkg.com/poorlyfills@0.1.1/min.js"><'+'/script>');
try{new EventTarget}catch(e){document.write('<script src="https://unpkg.com/event-target@1.2.2/min.js"><'+'/script>')}
</script>
```


Following a `workers/os.js` file to serve via NodeJS.
```js
// note: you require a facade here via 'workway'
var workway = require('workway');
workway(require('os'));
```

An express / node based bootstrap.
```js
var express = require('express');

// note: you require the real module as 'workway/node'
var workway = require('workway/node');
// authorize / expose a specific folder
// that contains web driven workers
workway.authorize(__dirname + '/workers');

var app = workway.app(express());
app.use(express.static(__dirname + '/www'));
app.listen(8080);
```

### NodeJS extra features & gotchas

  * exact same API (actually exact same code) of the real Web Worker based client side
  * circular objects are supported out of the box via [flatted](https://github.com/WebReflection/flatted#flatted) on both ways
  * the `self` global (but sandboxed) variable points at the global
  * the `self.workway` method is already there, feel free to use it instead of requiring it from workers
  * the `self.addEventListener` and `self.remoteEventListener` are normalized to work like on the front end side: do not use emitter methods directly with your node workers or messages and errors might not be signaled as expected


## The RemoteClass convention

Classes exposed through `workway` namespace must follow these rules:

  * no constructor arguments; use methods to eventually forward extra details from the client
  * methods can accept only serializable arguments and can return either a serializable value or a promise that will resolve as serializable data
  * properties set on the **client** side must be serializable and will be **reflected** into related worker instances whenever methods are invoked
  * properties set in the **worker** will **not** be **reflected** on the client side so that what's defined in the worker, stays in the worker
  * every method invocation returns a Promise, even if the method returned value is not
  * multiple methods invocation at once are possible, but there is no guarantee of the order. Use promises features or `await` each call if sequential methods calls depend on previous results.



## Compatibility

The code is written in a ES5 friendly syntax, and it's guaranteed to work in IE 10 or above, and mostly every mobile browser on platforms such iOS 8+, Android 4.4+, Blackberry OS 10+, or Windows Phone 8+.

You can test live your browser through the **[live test page](https://webreflection.github.io/workway/test/index.html)**.

Please note in IE 10/11 or other old browser cases, you might need to provide polyfills on both client and worker side.

Feel free to choose the polyfill you prefer.

Following just as example:

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



## About Recursive data

If you need to invoke a method passing an object that might contain recursive data you can serialize it upfront and parse it once received.

```js
// main thread app.js side
import workway from 'https://unpkg.com/workway/esm';
import {stringify} from 'https://unpkg.com/flatted/esm';

workway('analyzer.js').then(({namespace}) => {
  const data = {arr: []};
  data.arr.push(data);
  data.data = data;
  namespace.analyze(stringify(data))
            .then(
              state => document.body.textContent = state,
              console.error
            );
});



// worker side: analyzer.js
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
```

You can [test above example right here](https://webreflection.github.io/workway/test/circular/).



### Extra Info

  * the client side of this package fits in just 100 LOC
  * the client side of this project weights 0.5K via brotli, 0.6K via gzip
  * the client side source of truth of this project is its root `./index.js`
  * the only worker related code is in `./worker.js` root file
  * the ESM version of this module is in `esm/index.js`
  * the CJS version of this module is in `cjs/index.js`
  * the browser version of this module is in `min.js`
