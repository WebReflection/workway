window.workway = (function (Worker, workway, SECRET) {

  /*! Copyright 2018 Andrea Giammarchi - @WebReflection
   *
   * Permission to use, copy, modify, and/or distribute this software
   * for any purpose with or without fee is hereby granted,
   * provided that the above copyright notice
   * and this permission notice appear in all copies.
   * 
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS
   * ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING
   * ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
   * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL,
   * DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR
   * ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
   * DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
   * NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   */

  // ${JSON}

  var instances = [];
  var sockets = new WeakMap();

  addEventListener(
    'beforeunload',
    function () {
      while (instances.length) instances[0].terminate();
    },
    false
  );

  function NodeWorker(ep) {
    var socket = io();
    var self = new EventTarget;
    self.postMessage = this.postMessage;
    self.terminate = this.terminate;
    instances.push(self);
    sockets.set(self, socket);
    socket.on(SECRET + ':error', this.onerror.bind(self));
    socket.on(SECRET + ':message', this.onmessage.bind(self));
    socket.emit(SECRET + ':setup', ep);
    return self;
  }

  function createEvent(type) {
    var event = document.createEvent('Event');
    event.initEvent(type, false, true);
    event.stopImmediatePropagation = event.stopImmediatePropagation ||
                                      event.stopPropagation;
    return event;
  }

  NodeWorker.prototype = {

    onerror: function (message) {
      var event = createEvent('error');
      var error = JSON.parse(message);
      event.message = error.message;
      event.stack = error.stack;
      this.dispatchEvent(event);
      if (this.onerror) this.onerror(event);
    },

    onmessage: function (message) {
      var event = createEvent('message');
      event.data = JSON.parse(message);
      this.dispatchEvent(event);
      if (this.onmessage) this.onmessage(event);
    },

    postMessage: function (message) {
      sockets.get(this).emit(SECRET, JSON.stringify(message));
    },

    terminate: function () {
      instances.splice(instances.indexOf(this), 1);
      sockets.get(this).destroy();
    }

  };

  return function (file) {
    if (/^node:\/\/([\w._-]+)/.test(file)) {
      file = RegExp.$1;
      window.Worker = NodeWorker;
      var promise = workway(file);
      window.Worker = Worker;
      return promise;
    } else
      return workway(file);
  };

}(Worker, workway, '${SECRET}'));
