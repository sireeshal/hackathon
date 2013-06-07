// https://groups.google.com/group/nodejs/browse_thread/thread/de210ac427e3cdda/dafd160eb6e24063?lnk=raot
// https://gist.github.com/903338

var http = require('http');

//--------------------------------------------------------------------------
// Fixes a bug in node http client that prevents using maxSockets connection
//--------------------------------------------------------------------------
var assert = require('assert').ok;
var debug;
if (process.env.NODE_DEBUG && /http/.test(process.env.NODE_DEBUG)) {
  debug = function(x) { console.error('HTTP: %s', x); };
} else {
  debug = function() { };
}
function httpSocketSetup(socket) {
  // NOTE: be sure not to use ondrain elsewhere in this file!
  socket.ondrain = function() {
    if (socket._httpMessage) {
      socket._httpMessage.emit('drain');
    }
  };
}
http.Agent.prototype._cycle = function() {
  debug('Agent _cycle sockets=' + this.sockets.length + ' queue=' + this.queue.length);
  var self = this;

  var first = this.queue[0];
  if (!first) return;

  var haveConnectingSocket = false;

  // First try to find an available socket.
  for (var i = 0; i < this.sockets.length; i++) {
    var socket = this.sockets[i];
    // If the socket doesn't already have a message it's sending out
    // and the socket is available for writing or it's connecting.
    // In particular this rules out sockets that are closing.
    if (!socket._httpMessage &&
        ((socket.writable && socket.readable) || socket._httpConnecting)) {
      debug('Agent found socket, shift');
      // We found an available connection!
      this.queue.shift(); // remove first from queue.
      assert(first._queue === this.queue);
      first._queue = null;

      first.assignSocket(socket);
      httpSocketSetup(socket);
      
      process.nextTick(function() {
        first.emit('start');
      });
      
      self._cycle(); // try to dispatch another
      return;
    }

    //if (socket._httpConnecting) haveConnectingSocket = true;
  }

  // If no sockets are connecting, and we have space for another we should
  // be starting a new connection to handle this request.
  if (!haveConnectingSocket && this.sockets.length < this.maxSockets) {
    this._establishNewConnection();
  }

  // All sockets are filled and all sockets are busy.
};
//--------------------------------------------------------------------------
// end bug fix
//--------------------------------------------------------------------------