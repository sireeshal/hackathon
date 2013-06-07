var app = require( './app' );
var util = require( 'util' );
var logger = require( './lib/logger.js' );
var pkginfo = require( 'pkginfo' )( module );
var harbor = require( 'spindrift-harbor' );
var nconf = require( 'nconf' );
var cluster = require( 'cluster' );

var NUM_WORKERS = (nconf.get( 'NUM_WORKERS' ) === 'default')
  ? os.cpus().length
  : nconf.get( 'NUM_WORKERS' );

var PORT = parseInt( nconf.get( 'PORT' ) );
var ROLE = module.exports.name + '@' + module.exports.version;
var USE_PORT_AUTHORITY = (nconf.get( 'USE_PORT_AUTHORITY' ) === 'true' || nconf.get( 'USE_PORT_AUTHORITY' ) === true);
var PORT_AUTHORITY_HOST = nconf.get( 'PORT_AUTHORITY_HOST' );
var PORT_AUTHORITY_PORT = parseInt( nconf.get( 'PORT_AUTHORITY_PORT' ) );

// if no PORT has been configurated then we're probably running in a test
// or someone else plans to call listen on me
if ( !PORT ) {
  logger.log( "warn", "NOT AUTOMATICALLY STARTING APP to LISTEN, running a test?" );
}

// Otherwise, if there's just one worker, don't use cluster
else if ( NUM_WORKERS === 1 ) {
  logger.log( "info", "not using cluster, starting just one process on " + PORT );
  app.listen( PORT, registerToPortAuthority );
}

// Use cluster to start app
else {
  // Start the app using the cluster API
  if ( cluster.isMaster ) {
    logger.log( "info", "starting MASTER on " + PORT + ", starting " + NUM_WORKERS + " workers" );
    registerToPortAuthority();

    // Fork workers.
    for ( var i = 0; i < NUM_WORKERS; i++ ) {
      cluster.fork();
    }

    cluster.on( 'death', function ( worker ) {
      logger.log( "warn", 'worker ' + worker.pid + ' died' );
      cluster.fork();
    } );
  }
  else {
    logger.log( "info", "starting WORKER " + process.env.NODE_WORKER_ID );
    app.listen( PORT );
  }
}

function registerToPortAuthority() {
  logger.log( "info", "USE_PORT_AUTHORITY " + USE_PORT_AUTHORITY );
  if ( USE_PORT_AUTHORITY ) {
    harbor.init( {
      portAuthorityHost: PORT_AUTHORITY_HOST,
      portAuthorityPort: PORT_AUTHORITY_PORT,
      docks: [
        {
          role: ROLE,
          port: PORT
        }
      ]
    } );
    var SIGTERM_TIME_BUFFER = 10000;

    process.on( 'SIGTERM', function () {
      harbor.undock();

      if ( app.connections === 0 ) {
        logger.log( 'info', 'received SIGTERM, exiting immediately because there are not open connections' )
        process.exit( 0 );
        return;
      }

      logger.log( 'info', 'received SIGTERM, unregistering from Port Authority and process will terminate in ' + SIGTERM_TIME_BUFFER + 'ms...' )

      setInterval( function () {
        logger.log( 'info', 'connections (including keep-alive): ' + app.connections );
      }, 1000 );

      setTimeout( function () {
        process.exit( 0 )
      }, SIGTERM_TIME_BUFFER )
    } );

  }
}
