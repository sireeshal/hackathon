var https                 = require( 'https' )
  , http                  = require( 'http' )
  , oauth                 = require( 'eclg-google-oauth' ).googleOauth
  , hbs             = require('eclg-google-service-client/node_modules/hbs')
  , request               = require( 'request' )
  , assert                = require( 'assert' )
  , querystring           = require( 'querystring' )
  , fs                    = require( 'fs' )
  , URL                   = require( 'url' )
  , logger                = require('./logger.js')
  , _                     = require( 'underscore' )
  , successTemplate       = fs.readFileSync( __dirname + '/templates/googleAuthorizeSuccess.html', 'utf8' )
  , errorTemplate         = fs.readFileSync( __dirname + '/templates/googleAuthorizeError.html', 'utf8' )
  , googleConsumer        = {}
  , self = module.exports = googleConsumer
  , GOOGLE_OAUTH2_URL     = "https://accounts.google.com/o/oauth2/token"
  , WHIT_CREATE_CREDENTIAL  = "{{url}}/createConsumerCredential/{{id}}.json?email={{email}}"
  , WHIT_REMOVE_CREDENTIAL  = "{{url}}/removeConsumerCredential/{{id}}.json?email={{email}}"
  , nconf         = require('nconf');


self.getConfig = function( callback ) {
  var result = {
      googleConsumerObject: {
        scope: nconf.get("GCO_SCOPE"),
        state: nconf.get("GCO_STATE"),
        redirect_uri: nconf.get("GCO_REDIRECT_URI"),
        response_type: nconf.get("GCO_RESPONSE_TYPE"),
        access_type: nconf.get("GCO_ACCESS_TYPE"),
        client_id: nconf.get("GOOGLE_OAUTH2_CLIENT_KEY")
      }
  }
  callback( null, result );
}

// Google oauth2 API call to get tokens
self.getTokens = function( code, callback ) {
  if( !code )
    return callback( 'error', { statusCode: "400" }, null );

  var urlParts = URL.parse( GOOGLE_OAUTH2_URL );
  var options = {
      host: urlParts.host,
      path: urlParts.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
  };
  var body = querystring.stringify( {
    code: code,
    client_id: nconf.get("GOOGLE_OAUTH2_CLIENT_KEY"),
    client_secret: nconf.get("GOOGLE_OAUTH2_CLIENT_SECRET"),
    redirect_uri: nconf.get("GCO_REDIRECT_URI"),
    grant_type: 'authorization_code'
  } );

  logger.log("debug2", 'google consumer get tokens request', options);

  var request = https.request( options, function( response ) {
    var tokenObj = "";
    response.setEncoding( 'utf8' );

    response.on( 'data', function ( chunk ) {
      tokenObj += chunk;
    } );

    response.on( 'end', function ( result ) {
      callback( false, { data: tokenObj }, response );
    } );
  } );

  request.on( 'error', function( error ) {
    callback( error.message, { data: error }, null );
  } );

  request.write( body );
  request.end();
}

self.getSuccessPage = function( req, res ) {
  var content = successTemplate
      .replace( /{{code}}/g, req.url )
      .replace( /{{messageUrl}}/g, req.query.state );

  if( typeof( req.query.code ) === 'undefined' ){
    content = 'Error receiving authorization code from Google.</br>' +
    '<button onClick="javascript: self.close();">Close</button>';
  }

  if( typeof( req.query.error ) !== 'undefined' ){
    var content = errorTemplate
    .replace( /{{error}}/g, req.query.error )
    .replace( /{{messageUrl}}/g, req.query.state );
  }

  res.send( content );
}

// add user to the chamber
self.putChamber = function( putObj, callback ) {

  logger.log("debug2", "google consumer Chamber put data ", putObj);
  oauth.chamberPut( putObj, function ( error, data ) {
    if( error ) {
      logger.log("error", 'putChamber returning error', [error, data] );
      return callback( "error", 500, data );
    }
    try {
      data = JSON.parse( data );
    }
    catch ( error ){
      data = { status: 'error', code: '500', error: error }
    }
    if( data.status === 'success' ) {
      callback( null, { statusCode: data.code, data: data }, data );
    }
    else {
      callback("error", { statusCode: data.code }, data );
    }
  })
}

//remove user from chamber
self.chamberDelete = function( deleteObj, callback ) {
  oauth.chamberDelete( deleteObj, function ( err, data ) {
    if( err ) {
      try {
        data = JSON.parse( JSON.parse( err.error ).data );
      }
      catch ( error ){
        return callback( "error", "500", err );
      }
    }
    else{
      try {
        data = JSON.parse( data );
      }
      catch ( error ){
        data = { status: 'error', code: '500', error: error }
      }
    }
    if( data.status === 'success' ) {
      callback( null, { statusCode: data.code, data: data }, data );
    }
    else {
      callback("error", { statusCode: data.code }, data );
    }
  } );
}

self.whitCredential = function( dataObj, callback ) {
    var baseUrl = dataObj.method === 'save' ? WHIT_CREATE_CREDENTIAL : WHIT_REMOVE_CREDENTIAL;
    var feedUrl = self._getFeedUrl( baseUrl, {
        url: dataObj.url,
        id: dataObj.id,
        email: dataObj.email
    });

    var options = {
        uri:feedUrl,
        headers: {
            "Content-Length": 0,
            "token": encodeURIComponent( dataObj.token )
        },
        method: "POST",
        timeout: 5000
    };

	logger.log("debug1",  'whitCredential options', options );
    request(options, function(error, response, body) {
        if (error) {
            logger.log("error", 'whitCredentials()', error);
            return callback( error.message, { data: error }, null );
        }
        try {
            var parsed = JSON.parse( body );
        } catch (err) {
            return callback( "error", { data: err }, response );
        }
        logger.log("debug2", 'whitCredentials data', parsed );
        if( parsed.status === 'success' ){
            callback( false, { data: parsed }, response );
        }
        else{
            callback( 'error', { data: parsed }, null );
        }
    });

//    var request = http.request( options, function( response ) {
//        var responseData = '';
//        response.setEncoding( 'utf8' );
//        response.on( 'data', function ( chunk ) {
//			logger.log("debug3", 'whitCredential DATA', chunk );
//            responseData += chunk;
//        } );
//
//        response.on( 'end', function ( result ) {
//            try {
//                var parsed = JSON.parse( responseData );
//            } catch (err) {
//                return callback( "error", { data: err }, response );
//            }
//			logger.log("debug2", 'whitCredentials data', parsed );
//            if( parsed.status === 'success' ){
//                callback( false, { data: result }, response );
//            }
//            else{
//                callback( 'error', { data: parsed }, null );
//            }
//			logger.log("debug1", 'whitCredentials END' );
//        } );
//    } );
//
//    request.on( 'error', function( error ) {
//		logger.log("error", 'whitCredentials()', error);
//			callback( error.message, { data: error }, null );
//    } );
//
//    request.write( '' );
//    request.end();
};


self._getFeedUrl = function(template, data) {
    // use handlebars to inject the email address into the URL specified in the config
    // eg "https://mail.google.com/mail/feed/atom/?xoauth_requestor_id={{email}}"
    var compiledTemplates = {}
      , compiledTemplate = compiledTemplates[template] || (compiledTemplates[template] = hbs.handlebars.compile(template))
      , escapedData = {}
      , keys = Object.keys(data);

    keys.forEach(function(key) {
        escapedData[key] = data[key];
    });

    return compiledTemplate(escapedData);
}
