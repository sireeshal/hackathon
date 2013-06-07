//
// The main application script
// ===========================
// Responsible for configuring and bootstrapping the application
//
//   * Config wire-up
//   * Defines HTTP routes
//   * Primarily handles main /toolbar JSONP request
//
var util = require( 'util' );
var https = require( 'https' );
var http = require( 'http' );
var fs = require( 'fs' );
var semver = require( 'semver' );
var path = require( 'path' );
var express = require( 'express' );
var app = module.exports = express();
var wsod = require( './lib/wsod.js' );
var dojonpm = require( 'eclg-dojo' );
var googleConsumer = require( './lib/googleConsumer.js' );
var googleOAuth = require( 'eclg-google-oauth' ).googleOauth;
var middleware = require( 'eclg-node-middleware' );
var Toolbar = require( './lib/schemas/toolbar' );
var mongoose = require( 'mongoose' );
var logger = require( './lib/logger.js' );
var cb = require( './lib/callback.js' );
var nconf = require( 'nconf' );
var statsd = require( './lib/statsd' );
var windmill = require( 'eclg-windmill' );
var keystore = require( 'eclg-keystore' );

// ----------------------------------------------------------------------------
// Config Validation
// ----------------------------------------------------------------------------
// load configs
var NODE_ENV = process.env.NODE_ENV || 'development';
logger.log( 'debug', 'ENV: ' + NODE_ENV );

var envConfigFile = __dirname + '/' + NODE_ENV + '.json';

console.log( envConfigFile );
nconf.argv();

var confOverrides = {};

// key is the HOST/PORT in env to map from. _HOST and _PORT will be appended when checking key in env variables
var overrideMap = {
  "PERSONA": [
    "ROOT_URL_PERSONA"
  ],
  "ALIAS": [
    "ALIAS_ROOT_URL"
  ]
};

// generate env mapped overrides
for ( var overrideField in overrideMap ) {
  if ( overrideMap.hasOwnProperty( overrideField ) ) {
    if ( process.env[overrideField + "_HOST"] ) {
      var value = "http://" + process.env[overrideField + "_HOST"];
      if ( process.env[overrideField + "_PORT"] ) {
        value += ":" + process.env[overrideField + "_PORT"];
      }
      if ( value ) {
        for ( var i = 0; i < overrideMap[overrideField].length; i++ ) {
          confOverrides[overrideMap[overrideField][i]] = value;
        }
      }
    }
  }
}

nconf.overrides( confOverrides ).env();

try {
  nconf.defaults( JSON.parse( fs.readFileSync( envConfigFile, 'utf-8' ) ) )
}
catch ( ex ) {
  logger.log( 'warning', 'environment config file not found: ' + envConfigFile );
}

nconf.file( {file: __dirname + '/config.json'} );

if ( !nconf.get( "GOOGLE_OAUTH1_CLIENT_KEY" ) ) {
  throw("FATAL: GOOGLE_OAUTH1_CLIENT_KEY not defined");
}
if ( !nconf.get( "GOOGLE_OAUTH1_CLIENT_SECRET" ) ) {
  throw("FATAL: GOOGLE_OAUTH1_CLIENT_SECRET not defined");
}
if ( !nconf.get( "GOOGLE_OAUTH2_CLIENT_KEY" ) ) {
  throw("FATAL: GOOGLE_OAUTH2_CLIENT_KEY not defined");
}
if ( !nconf.get( "GOOGLE_OAUTH2_CLIENT_SECRET" ) ) {
  throw("FATAL: GOOGLE_OAUTH2_CLIENT_SECRET not defined");
}
if ( !nconf.get( "WHITTAKER_ROOT_URL" ) ) {
  throw("FATAL: WHITTAKER_ROOT_URL not defined");
}
if ( !nconf.get( "WINDMILL_ROOT_URL" ) ) {
  throw("FATAL: WINDMILL_ROOT_URL not defined");
}
if ( !nconf.get( "WSOD_M_ROOT_URL" ) ) {
  throw("FATAL: WSOD_M_ROOT_URL not defined");
}
if ( !nconf.get( "WSOD_PH_ROOT_URL" ) ) {
  throw("FATAL: WSOD_PH_ROOT_URL not defined");
}
if ( !nconf.get( "WSOD_CLIENT_ID" ) ) {
  throw("FATAL: WSOD_CLIENT_ID not defined");
}
if ( !nconf.get( "AFFINITY_PERSONA_ROOT_URL" ) ) {
  throw("FATAL: AFFINITY_PERSONA_ROOT_URL not defined");
}
if ( !nconf.get( "AFFINITY_PRESENCE_ROOT_URL" ) ) {
  throw("FATAL: AFFINITY_PRESENCE_ROOT_URL not defined");
}
if ( !nconf.get( "LOGGER" ) ) {
  throw("FATAL: LOGGER not defined");
}

//----------------------------------------------------------------------------
// Google Consumer Authorization Definitions
//----------------------------------------------------------------------------
if ( !nconf.get( "GCO_STATE" ) ) {
  throw("GCO_STATE not defined");
}
if ( !nconf.get( "GCO_REDIRECT_URI" ) ) {
  throw("FATAL: GCO_REDIRECT_URI not defined");
}
if ( !nconf.get( "GCO_RESPONSE_TYPE" ) ) {
  throw("FATAL: GCO_RESPONSE_TYPE not defined");
}
if ( !nconf.get( "GCO_ACCESS_TYPE" ) ) {
  throw("FATAL: GCO_ACCESS_TYPE not defined");
}
if ( !nconf.get( "CHAMBER_ROOT_URL" ) ) {
  throw("FATAL: CHAMBER_ROOT_URL not defined");
}
if ( !nconf.get( "GOOGLE_ROOT_REFRESH_URL" ) ) {
  throw("FATAL: GOOGLE_ROOT_REFRESH_URL not defined");
}

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------

// setup general logging
logger.init( nconf.get( "LOGGER" ) );

// setup logging for express
app.use( express.logger( logger.expressLoggerConfig() ) );

var googleOauthObj = {
  chamberRootUrl: nconf.get( "CHAMBER_ROOT_URL" ),
  googleRootRefreshUrl: nconf.get( "GOOGLE_ROOT_REFRESH_URL" ),
  rootUrl: nconf.get( "WHITTAKER_ROOT_URL" ),
  oauth1ClientId: nconf.get( "GOOGLE_OAUTH1_CLIENT_KEY" ),
  oauth1ClientSecret: nconf.get( "GOOGLE_OAUTH1_CLIENT_SECRET" ),
  oauth2ClientId: nconf.get( "GOOGLE_OAUTH2_CLIENT_KEY" ),
  oauth2ClientSecret: nconf.get( "GOOGLE_OAUTH2_CLIENT_SECRET" )
};

logger.log( 'info', 'GOOGLE OAUTH CONFIG' + JSON.stringify( googleOauthObj ) );
googleOAuth.init( googleOauthObj );
middleware.consumer.init( googleOauthObj );
statsd.init( nconf.get( 'STATSD_HOST' ), nconf.get( 'STATSD_PORT' ) );

wsod.init( {
  mServiceRoot: nconf.get( "WSOD_M_ROOT_URL" ),
  phServiceRoot: nconf.get( "WSOD_PH_ROOT_URL" ),
  affinityPersonaServiceRoot: nconf.get( "ROOT_URL_PERSONA" ),
  clientId: nconf.get( "WSOD_CLIENT_ID" )
} );

var keystoreConfig = nconf.get( 'KEYSTORE' );
var windmillConfig = nconf.get( 'WINDMILL' );

keystore.init( {
  rootUrl: keystoreConfig.ROOT_URL,
  aes_keyMoniker: keystoreConfig.AES_KEY_MONIKER
} );

keystore.aesDecrypt( windmillConfig.KEY, function ( error, decryptedKey ) {

  if ( error ) {
    logger.log( 'error', 'keystore decrypt error: ' + error );
  }
  else if ( !decryptedKey ) {
    logger.log( 'error', 'keystore returned empty result for decryption of windmill key' );
  }
  else {

    windmill.init( {
      rootUrl: windmillConfig.ROOT_URL,
      key: decryptedKey,
      keyMoniker: windmillConfig.KEY_MONIKER
    } );

    logger.log( 'info', 'windmill configured' );

  }

} );

//set the default outbound socket pool very high
http.globalAgent.maxSockets = 10000;
https.globalAgent.maxSockets = 10000;
//============================================================================
//Mongo Connection
//============================================================================

function mongoConnectionCallback( error ) {
  if ( error ) {
    var message = "error establishing connection to mongo " + nconf.get( "mongodbConnectionUrl" ) + " : " + error;
    logger.log( "error", message );
    throw message;
  }
  else {
    logger.log( "info", "connection to mongo " + nconf.get( "mongodbConnectionUrl" ) + " opened" );
  }
}

if ( nconf.get( "mongodbConnectionUrl" ) && nconf.get( "mongodbConnectionUrl" ).indexOf( "," ) > 0 ) {
  logger.log( "info", "Connecting to MongoDb relica set: " + nconf.get( "mongodbConnectionUrl" ) );
  db = mongoose.createSetConnection( nconf.get( "mongodbConnectionUrl" ), mongoConnectionCallback );
  Toolbar = Toolbar.init( db );
}
else {
  logger.log( "info", "Connecting to a single MongoDb server: " + nconf.get( "mongodbConnectionUrl" ) );
  db = mongoose.createConnection( nconf.get( "mongodbConnectionUrl" ), mongoConnectionCallback );
  Toolbar = Toolbar.init( db );
}

function ifAuthorized( req, res, callback ) {
  if ( !req.authenticated ) {
    return cb.resultCallback( req, res )( 'authorization failed', { statusCode: 401 }, null );
  }
  else {
    callback();
    return null;
  }
}

// ----------------------------------------------------------------------------
// Express app configuration
// ----------------------------------------------------------------------------
// The toolbar uses [Express](https://github.com/visionmedia/express)
var ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

app.tearDown = function () {
  app.close();
  db && db.close();
};

// in production mode use gzip compression
// note: this litters the directorys with *.gz files
app.configure( 'production', function () {

} );

app.configure( function () {
  app.set( 'Toolbar', Toolbar );    //maybe move to consumer js
  app.set( 'ifAuthorized', ifAuthorized );
  app.set( 'middleware', middleware );
  app.set( 'googleOAuth', googleOAuth );
  app.set( 'wsod', wsod );
  app.set( 'windmill', windmill )
  app.use(express.bodyParser());

  app.use( app.router );
  //  app.use( express.compress() );
  app.use( dojonpm['static']( "1.6.1" ) );

  app.use( express['static']( __dirname + "/public", { maxAge: 0} ) );
} );

// Requests starting with "/js/cache-" are built, compresses layer files that we want to cache.
// Set the maxAge for caching// there are URLs that have the version number from the package.json prefixed
app.get( "/js/cache-*", express['static']( __dirname + "/public", { maxAge: ONE_YEAR} ) );

process.addListener( "uncaughtException", function ( err ) {
  logger.log( "error", "UNCAUGHT EXCEPTION, EXITING PROCESS... cause: " + (err.message || err) );
  err && err.stack && logger.log( "error", err.stack );
  process.exit( 1 );
} );


// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
require( './routes' )( app );


// verify that the version of node specified in the package.json is valid
var package_json = JSON.parse( fs.readFileSync( path.join( __dirname, "package.json" ) ) + "" );
if ( !semver.satisfies( process.version, package_json.engines.node ) ) {
  logger.log( "warn", "WARNING! NOT running the node.js version specified in the package.json!\n" +
                      "**** '" + process.version + "' not compatable with '" + package_json.engines.node + "' ****" );
}
