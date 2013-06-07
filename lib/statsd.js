var dgram = require( 'dgram' );

module.exports = (new function () {
  this._host = '127.0.0.1';
  this._port = 8125;
  this._client = dgram.createSocket( "udp4" );

  this.init = function ( host, port ) {
    this._host = host;
    this._port = port;
  };

  this._send = function ( message ) {
    //console.log('STATSD', message);
    var buffer = new Buffer( message );
    this._client.send( buffer, 0, buffer.length, this._port, this._host );
  };

  this.counter = function ( name, value ) {
    value = value || 1;
    var message = this._counterMessage( name, value );
    this._send( message );
  };

  this.timer = function ( name, duration ) {
    var self = this;

    // if duration is not passed in, return an object that
    // has an end function that can be called.
    if ( !duration ) {
      var start = Date.now();

      return new function () {
        this.end = function () {
          var duration = Date.now() - start;
          var message = self._timerMessage( name, duration );
          self._send( message );
        }
      };
    }
    else {
      var message = self._timerMessage( name, duration );
      self._send( message );
    }
  };

  this._timerMessage = function ( name, duration ) {
    return name + ':' + duration + '|ms';
  };

  this._counterMessage = function ( name, value ) {
    return name + ':' + value + '|c';
  };
});
