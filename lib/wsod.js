/**
 * Contains wrapped calls to m-api, ph-api, and affinity. WSOD might not be the
 * best moniker...
 * @author Mike Brevoort
 */

var util = require( 'util' )
  , https = require( 'https' )
  , http = require( 'http' )
  , fs = require( 'fs' )
  , querystring = require( 'querystring' )
  , hbs = require( 'hbs' )
  , request = require( 'request' )
  , logger = require( './logger.js' )
  , url = require( 'url' );


var wsod = {};
module.exports = wsod;

wsod.init = function ( config ) {
  this.M_SERVICE_ROOT = config.mServiceRoot;
  this.PH_SERVICE_ROOT = config.phServiceRoot;
  this.AFFINITY_PERSONA_ROOT = config.affinityPersonaServiceRoot;
  this.CLIENT_ID = config.clientId;
  this.TIMEOUT = 5000;

  function setMaxSockets( url_root ) {
    var parsed = url.parse( url_root );
    if ( parsed.protocol == 'http' ) {
      http.getAgent( parsed.host ).maxSockets = 100;
    }
    else if ( parsed.protocol == 'https' ) {
      https.getAgent( {host: parsed.host} ).maxSockets = 100;
    }
  }

  setMaxSockets( this.M_SERVICE_ROOT );
  setMaxSockets( this.PH_SERVICE_ROOT );
  setMaxSockets( this.AFFINITY_PERSONA_ROOT );

  return this;
};

wsod.token = function ( username, password, callback ) {
  // TODO replace this hardcoded person Id with "me"
  var url = this.M_SERVICE_ROOT + "/token";
  var body = {
    grant_type: 'password',
    username: username,
    password: password,
    client_id: this.CLIENT_ID
  };
  var options = {
    uri: url,
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded"},
    timeout: this.TIMEOUT,
    body: querystring.stringify( body )
  };

  logger.log( "debug2", 'WSOD token request ', options );

  request( options,
    function ( error, response, body ) {
      body = parseJsonBody( error, response, body );
      callback( error, response, body );
    }
  );
};

wsod.courses = function ( token, callback ) {
  var url = this.M_SERVICE_ROOT + "/me/courses?expand=course";
  var options = {
    uri: url,
    timeout: this.TIMEOUT,
    headers: { "x-authorization": "Access_Token access_token=" + token }
  };

  logger.log( "debug2", 'WSOD courses request ', options );

  request( options,
    function ( error, response, body ) {
      body = parseJsonBody( error, response, body );
      callback( error, response, body );
    }
  );
};

wsod.mapCourseId = function ( token, callback ) {
  var url = this.PH_SERVICE_ROOT + "/me/courseIdMap";
  var options = {
    uri: url,
    timeout: this.TIMEOUT,
    headers: { "x-authorization": "Access_Token access_token=" + token }
  };

  logger.log( "debug2", 'WSOD mapCourseId request ', options );

  request( options,
    function ( error, response, body ) {
      logger.log( "debug2", 'WSOD mapCourseId response ' + body );
      body = parseJsonBody( error, response, body );
      callback( error, response, body );
    }
  );
};

wsod.windmillTokenExchange = function ( moauth_access_token, callback ) {
  var url = this.PH_SERVICE_ROOT + "/windmilltoken";
  var options = {
    uri: url,
    timeout: this.TIMEOUT,
    headers: { "x-authorization": "Access_Token access_token=" + moauth_access_token }
  };

  logger.log( "debug2", 'WSOD windmillTokenExchange request', options );
  request( options,
    function ( error, response, body ) {
      body = parseJsonBody( error, response, body );
      callback( error, response, body );
    }
  );
};

wsod.cssOverrideRoot = function ( slug ) {
  return this.M_SERVICE_ROOT + "/clients/berlin." + slug + "/stylefiles";
};

// wsod.cssOverrideUrl = function(token, callback) {
//     var url = this.M_SERVICE_ROOT + "/me/homenode";
//     var self = this;
//     request({
//             uri:url,
//             headers: { "x-authorization": "Access_Token access_token=" + token }
//         },
//         function(error, response, body) {
//             if(!error && response.statusCode == 200) {
//                 body = parseJsonBody(error, response, body);
//                 var clientSortString = body.homeNode.clientSortString;
//                 var cssUrl = self.M_SERVICE_ROOT + "/clients/" + clientSortString + "/stylefiles/toolbar/inst-override.css";
//                 return callback(false, cssUrl);
//             }

//             logger.log("debug2", "Could not get clientSortString for token " + token);
//             error = error || true;
//             return callback(error, "");
//         }
//     );
// };

// http://peaks.eclg.org/get-meaffinityassertion
wsod.affinityAssertion = function ( token, callback ) {
  var url = this.PH_SERVICE_ROOT + "/me/affinityAssertion";
  var options = {
    uri: url,
    timeout: this.TIMEOUT,
    headers: { "x-authorization": "Access_Token access_token=" + token }
  };

  logger.log( "debug2", 'WSOD affinityAssertion request ', options );
  request( options,
    function ( error, response, body ) {
      body = parseJsonBody( error, response, body );
      callback( error, response, body );
    }
  );
};

wsod.affinitySession = function ( assertion, callback ) {
  var url = this.AFFINITY_PERSONA_ROOT + "/Affinity/v1/session?Authorization=" + assertion;

  var options = {
    uri: url,
    timeout: this.TIMEOUT
  };

  logger.log( "debug2", 'WSOD affinitySession request ', options );
  request( options,
    function ( error, response, body ) {
      body = parseJsonBody( error, response, body );
      callback( error, response, body );
    }
  );
};


wsod.affinityAvatarUrl = function ( token ) {
  var url = this.AFFINITY_PERSONA_ROOT + "/Affinity/v1/avatar/"
              + this.affinityIdFromToken( token ) + "?Authorization=" + token;
  return url;
}

/**
 * Given an affinity token return an Affinity Avatar URL wrapped in a callback
 * @param {string} token Affinity Access Token
 * @param {function} callback function(error, avatarUrl)
 * @return undefined
 */
wsod.getAffinityAvatarUrl = function ( token, callback ) {
  this.affinityAssertion( token, function ( error, response, body ) {
    if ( error || response.statusCode != 200 ) {
      logger.log( "error", "affinityAssertion: " + error );
      return callback( error || true );
    }

    var assertion = body.affinityAssertion.assertion;

    wsod.affinitySession( assertion, function ( error, response, body ) {
      if ( error || response.statusCode != 200 ) {
      	logger.log( "error", "affinitySession: " + error );
        return callback( error || true );
      }

      var affinity_access_token = body.affinityToken;
      var avatarUrl = wsod.affinityAvatarUrl( affinity_access_token );

      callback( false, {
        avatarUrl: avatarUrl,
        access_token: affinity_access_token
      } );
    } );
  } );
};

/**
 *  Request the affinity Url and if the response code is 200 then stream back the
 *  contents of the image, otherwise call next which should invoke the next express route
 *  available
 */
wsod.streamAffinityAvatar = function ( token, response, next ) {
  var avatarUrl = wsod.affinityAvatarUrl( token );

  var nextCalled = false;
  var callNext = function () {
    if ( nextCalled ) {
      return;
    }
    nextCalled = true;
    next();
  };

  var options = {
    uri: avatarUrl,
    timeout: this.TIMEOUT
  };

  logger.log( "debug2", 'WSOD streamAffinityAvatar request ', options );
  try {
    var req = request( options ).on( 'response',function ( res ) {
      if ( res.statusCode == 200 ) {

        logger.log( "debug2", 'WSOD streamAffinityAvatar streaming ', options );
        req.pipe( response );
      }
      else {
        callNext();
      }
    } ).on( 'error', function ( ex ) {
        logger.log( 'warning', 'streamAffinityAvatar exception: ' + ex );
        callNext();
      } );
  }
  catch ( ex ) {
    logger.log( 'warning', 'streamAffinityAvatar exception: ' + ex );
    callNext();
  }
};

wsod.affinityIdFromToken = function ( token ) {
  if ( token && token.indexOf( ":" ) ) {
    return token.split( ":" )[0];
  }
};

function parseJsonBody( error, response, body ) {
  if ( !error && response.headers["content-type"].indexOf( "application/json" ) === 0 ) {
    return JSON.parse( body );
  }
  else {
    return body;
  }
}


