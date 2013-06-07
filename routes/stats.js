var statsd = require( '../lib/middleware/statsd' );
var nconf = require( 'nconf' );
var logger = require( '../lib/logger.js' );
var metrics = require( '../lib/statsd' );
var url = require( 'url' );

module.exports = function ( app ) {

  app.get( /^\/stats\/counter\/.*/, statsd( 'stats.counter' ), function ( req, res ) {

    // don't wait for anything here to finish
    res.writeHead(200, {
      'Content-Type': 'application/x-javascript'
    } );
    res.end( "//NO-OP" );

    //short term solution - new toolbar will do it differently
    var parsedUrl = url.parse( req.url );
    var routes = parsedUrl.pathname.replace( '/stats/counter/', '' ).split( '/' );

    var name = ['toolbar.client', routes[0]].join( '.' ),
      value = routes[1] || 1;

    logger.log( 'debug1', 'client stats counter: ' + name + ':' + value );

    metrics.counter( name, value );

  } );

  app.get( "/stats/timer/:name/:time", function ( req, res ) {

    // don't wait for anything here to finish
    res.writeHead(200, {
      'Content-Type': 'application/x-javascript'
    } );
    res.end( "//NO-OP" );

    req.params.time = parseInt( req.params.time, 10 );

    // nothing should take zero time and everything should have a name
    if ( req.params.time > 0 && req.params.name ) {

      logger.log( 'debug1', 'client stats timer' + req.params.name + ':' + req.params.time );

      metrics.timer( 'toolbar.client.' + req.params.name, req.params.time );

    }
    else {

      logger.log( 'warn', 'client stats timer call did not have valid params' + req.params );

    }


  } );

};
