var util = require( 'util' );
var whittaker = require( 'eclg-whittaker' );
var async = require( 'async' );
var querystring = require( 'querystring' );
var _ = require( 'underscore' );
var Fastpass = require( 'node-fastpass' );
var windmill = require( '../lib/windmill.js' );
var callback = require( '../lib/callback.js' );
var logger = require( '../lib/logger.js' );
var notifications = require( '../lib/notifications' );
var nconf = require( 'nconf' );
var statsd = require( '../lib/middleware/statsd' );
var metrics = require( '../lib/statsd' );
var request = require( 'request' );
var ASCFactory = require( 'asc' );

var helpService = nconf.get( "HELP_SERVICE" ) || {
  "DEFAULT_ROOT_URL": undefined,
  "SERVICE_URL": undefined
};

var getHelpLink = ASCFactory.getCache( 'RNTHelpLinks', {
  ttl: 3600000, // 60 minutes
  update: function ( token, callback ) {

    if ( helpService.SERVICE_URL ) {

      var queryURL = helpService.SERVICE_URL + '.json?' + querystring.stringify( { token: token } );

      logger.log( 'debug1', 'Querying RNT Help Link Service using: ' + queryURL );

      // query the service
      request( queryURL,
        function ( err, response, body ) {

          logger.log( 'debug1', 'RNT Help Link Service returned using token: ' + token + ': ' + body );

          if ( !err && response.statusCode == 200 && body ) {
            try {
              body = JSON.parse( body );
              if ( body.data ) {
                body = body.data;
              }
            }
            catch ( e ) {
              body = null;
            }

            callback( body );
          }
          else {
            callback( helpService.DEFAULT_ROOT_URL );
          }
        } );
    }
    else {
      logger.log( 'warning', 'HELP_SERVICE.SERVICE_URL not configured' );
      callback( helpService.DEFAULT_ROOT_URL );
    }

  }
} );

module.exports = function ( app ) {
  var ifAuthorized = app.get( 'ifAuthorized' );
  var middleware = app.get( 'middleware' );
  var googleOAuth = app.get( 'googleOAuth' );
  var whittakerConfig = { rootUrl: nconf.get( "WHITTAKER_ROOT_URL" )};
  var wsod = app.get( 'wsod' );
  var AFFINITY_TOKEN_REGEX = new RegExp( "affinity=[a-zA-Z0-9_:]+" );
  var course = require( '../lib/course' )( app );
  var alias = require( '../lib/alias' )( app );
  var timer;

  var startMeTimer = function ( req, res, next ) {
    timer = metrics.timer( 'toolbar.server.data.me' );
    logger.log('debug1', 'me timer started' );
    next();
  };

  var endMeTimer = function ( req, res, next ) {
    if ( timer ) {
      logger.log( 'debug2', 'me timer ended' );
      timer.end();
    }

    next();
  };

  whittaker.init( whittakerConfig );
  course.init( whittaker );

  //
  // Anonymous route for fetching basic institution information when given a slug
  //
  // * __param__  slug - query parameter of the institution slug
  // * __return__ basic publicly available insitution information for the given slug
  //
  app.get( '/toolbar-anon', function ( req, res, next ) {
    var slug = req.query.slug;
    var startTime = new Date().getTime();
    var resultCallback = callback.resultCallback( req, res );

    logger.log( "debug1", "GET /toolbar-anon request ", req.query );

    var result = {
      institution: {
        name: "",
        css_override_root: ""
      },
      config: {
        ph_root: nconf.get( "PH_ROOT_URL" ),
        admin_root: nconf.get( "ADMIN_ROOT_URL" ),
        m_api_root: nconf.get( "WSOD_M_ROOT_URL" ),
        ph_api_root: nconf.get( "WSOD_PH_ROOT_URL" ),
        static_root: nconf.get( "STATIC_ROOT_URL" ),
        affinity_persona_root: nconf.get( "AFFINITY_PERSONA_ROOT_URL" ),
        affinity_presence_root: nconf.get( "AFFINITY_PRESENCE_ROOT_URL" ),
        xmpp_root: nconf.get( "XMPP_ROOT_URL" ),
        xmpp_domain: (nconf.get( "XMPP_DOMAIN" )),
        help_root: helpService.DEFAULT_ROOT_URL || "http://whyberlin2011.custhelp.com/",
        google_analytics_tracker: nconf.get( "GOOGLE_ANALYTICS_TRACKER" ) || ""
      },
      timing: {}
    };

    whittaker.institution.publicinfo( slug, function ( error, response, body ) {
      if ( !error && response.statusCode == 200 ) {
        logger.log( "debug1", "whitaker institution public info response", body );
        // time to get whittaker enrollments
        result.timing.insitution_publicinfo = new Date().getTime() - startTime;
        // Metrics.emit("update", {name: 'toolbar.whittaker.insitution_publicinfo', val: result.timing.insitution_publicinfo });

        result.institution.name = body.name;
        result.institution.css_override_root = wsod.cssOverrideRoot( body.slug );
        resultCallback( false, { statusCode: 200 }, result );
      }
      else {
        logger.log( "error", "Whittaker institution publicinfo call failed: " + error + ",  slug is " + slug + ", response: " + JSON.stringify( body ) );
        return resultCallback( 'Whittaker institution publicinfo call failed, aborting', { statusCode: response.statusCode }, null );
      }
    } );
  } );

  function tokenExchange( req, res, next ) {
    var whit_access_token = req.query.whit_access_token && querystring.unescape( req.query.whit_access_token );
    var moauth_access_token = req.query.moauth_access_token && querystring.unescape( req.query.moauth_access_token );
    var startTime = Date.now();
    req.metrics = req.metrics || {};

    // validate if the tokens are present
    if ( !moauth_access_token && !whit_access_token ) {
      logger.log( "warn", "Failed exchanging MOAuth for Windmill token because moauth nor whitaker token are present" );
      return callback.resultCallback( req, res )( 'no valid access token', { statusCode: 403 }, null );
    }

    if ( moauth_access_token && !whit_access_token ) {
      // exchange for a moauth for whit token
      wsod.windmillTokenExchange( moauth_access_token, function ( error, response, body ) {
        req.metrics.windmill_token_exchange = Date.now() - startTime;

        if ( !error && response.statusCode == 200 ) {
          logger.log( "debug1", "Exchanging MOAuth for Windmill token sucessful" );
          req.headers["x-authorization"] = body.windmill_token && body.windmill_token.access_token;
          next();
        }
        else {
          logger.log( "error", "Error exchanging MOAuth for Windmill token " + error + " : " + JSON.stringify( body ) );
          // we're got no tokens... srry
          return res.send( 'no valid access token', 403 );
        }
      } );
    }
    else {
      logger.log( "debug1", "Exchanging MOAuth for Windmill token not needed due to whitaker token existing" );
      req.headers["x-authorization"] = whit_access_token;
      next();
    }

  }

  // Main toolbar data route
  //
  // * __param__  whit_access_token
  // * __param__  moauth_access_token
  // * __return__ toolbar data for current user given one of the two tokens
  //
  app.get( '/toolbar', tokenExchange, startMeTimer, middleware.consumer.whoMe(), endMeTimer, ifAuthorized, statsd( 'toolbar' ), function ( req, res, next ) {
    var token = req.token || req.headers["x-authorization"] || req.query.token;
    var me = req.me;
    var resultCallback = callback.resultCallback( req, res );

    //logger.log("debug1", "GET /toolbar request ", req.query);
    logger.log( "debug1", 'toolbar token', token );

    // create the result shell
    // this could obviously be more dynamic and configurable, text should be injected with
    // language files, probably using a template where text and config and state can be injected
    // no time for that now
    var result = {
      institution: {
        name: "",
        slug: "",
        is_google: false,
        is_admin: false,
        google_user_type: null,
        css_override_root: ""
      },
      profile: {
        avatar: "/images/person.png", // default
        name: "",
        email: ""
      },
      courses: [

      ],
      call_status: {
        courses: "success",
        affinity: "success"
      },
      tokens: {
        whit_access_token: token,
        whit_refresh_token: req.query.whit_refresh_token || "",
        affinity_access_token: req.query.affinity_access_token || "",
        affinity_id: affinityIdFromToken( token )
      },
      config: {
        root: nconf.get( "ROOT_URL" ),
        ph_root: nconf.get( "PH_ROOT_URL" ),
        admin_root: nconf.get( "ADMIN_ROOT_URL" ),
        share_root: nconf.get( "SHARE_ROOT_URL" ),
        static_root: nconf.get( "STATIC_ROOT_URL" ),
        m_api_root: nconf.get( "WSOD_M_ROOT_URL" ),
        ph_api_root: nconf.get( "WSOD_PH_ROOT_URL" ),
        affinity_persona_root: nconf.get( "AFFINITY_PERSONA_ROOT_URL" ),
        affinity_presence_root: nconf.get( "AFFINITY_PRESENCE_ROOT_URL" ),
        xmpp_root: nconf.get( "XMPP_ROOT_URL" ),
        xmpp_domain: (nconf.get( "XMPP_DOMAIN" )),
        help_root: helpService.DEFAULT_ROOT_URL || "http://whyberlin2011.custhelp.com/",
        google_analytics_tracker: nconf.get( "GOOGLE_ANALYTICS_TRACKER" ) || "",
        get_satisfaction_fastpass_url: "",
        refresh_interval: nconf.get( "REFRESH_INTERVAL" )
      },
      is_super_admin: false
    };

    // timing
    var startTime = new Date().getTime();
    result.timing = {};

    // Set the cache duration of the toolbar data to 60 seconds
    // We'll have to see what makes sense as we tune this
    /* res.header('Cache-Control', 'max-age=60'); */

    // For now, we're only dealing with one institution so we're doing the simplest thing
    // to get this out the door with this assumption. This of course will need to be
    // reworked once we know how the multiple institution scenario will work
    result.institution.name = me.institutionName;
    result.institution.slug = me.institutionSlug;
    result.institution.css_override_root = wsod.cssOverrideRoot( me.institutionSlug );
    result.profile.name = me.firstName;
    result.profile.email = me.email;
    result.institution.is_admin = me.hasInstitutionAdminAreaAccess;
    //  result.institution.google_user_type = req.me.googleUserType;

    // is google?
    result.institution.is_google = req.me.googleUserType !== null;
    result.institution.google_domain = me.googleDomain;
    result.institution.googleEmail = me.googleEmail || null;

    //check behaviors
    result.institution.is_social = me.behaviors && me.behaviors.indexOf( 'social_beta' ) != -1;
    result.institution.is_nursing = me.behaviors && me.behaviors.indexOf( 'nursing_admin' ) != -1; // look at behaviors

    //build config
    buildConfig( result );

    //logger.log("debug1", 'toolbar config', result.config);

    // TEMPORARY SHARE FILTERING LOGIG
    // filter the share URL
    // if the config value SHARE_FEATURE_SLUGS doesn't exist, show the share link
    // if the share filter is defined and the institution ID of the current
    // institution is in the array, show the share link, otherwise don't
    if ( nconf.get( "SHARE_FEATURE_FILTER_ON" ) && nconf.get( "SHARE_FEATURE_SLUGS" ) ) {
      if ( !_.include( nconf.get( "SHARE_FEATURE_SLUGS" ), result.institution.slug ) ) {
        delete result.config.share_root;
        delete result.config.share_url;
      }
    }

    // super admin?
    if ( me.hasSuperAdminAreaAccess ) {
      result.is_super_admin = true;
      result.profile.name = me.superAdmin && me.superAdmin.firstName;
      result.institution.name = "Nicht Berlin";
    }

    if ( !result.institution.is_nursing && !result.institution.is_social ) {
      // set up Get Satisfaction SSO
      var fastpass = new Fastpass( {
        key: nconf.get( "GS_OAUTH1_CLIENT_KEY" ),
        secret: nconf.get( "GS_OAUTH1_CLIENT_SECRET" ),
        email: result.profile.email,
        name: result.profile.name,
        uid: me.identityId,
        secure: nconf.get( "SECURE" )
      } );

      // save Get Satisfaction SSO url
      result.config.get_satisfaction_fastpass_url = fastpass.getUrl();
    }

    var tasks = {
      course: function ( callback ) {
        course.getCourses( me.enrollmentId, token, callback );
      },
      avatar: function ( callback ) {
        getAvatar( token, callback );
      },
      help: function ( callback ) {

        if ( result.institution.is_nursing ) {
          callback( null, nconf.get( "READYPOINT_HELP_URL" ) );
        }
        else {

          getHelpLink.get( token, function ( url ) {
            callback( null, url );
          } );

        }
      }
    };

    if ( result.institution.is_social && result.tokens.affinity_id === null ) {
      tasks.alias = function ( callback ) {
        getAlias( me.identityId, token, callback );
      };
    }
    
    var avatarStartTime = Date.now();
    
    async.parallel( tasks,
      function ( error, parallelResults ) {

        if ( !parallelResults ) {
          parallelResults = {};
        }

        if ( error ) {
          logger.log( 'error', 'Parallel task error for /toolbar route: ' + JSON.stringify( error ) );
        }

        var courses = ( parallelResults.course && parallelResults.course.courses ) || null;
        var avatarToken = ( parallelResults.avatar && parallelResults.avatar.access_token ) || null;
        var helpURL = parallelResults.help;

        if ( helpURL ) {
          result.config.help_url = helpURL;
        }

        if ( parallelResults.alias ) {
          console.log( 'AFFINITYID ' + parallelResults.alias.affinityId );
          result.tokens.affinity_id = parallelResults.alias.affinityId;
        }

        if ( courses && courses.length === 0 ) {
          result.call_status.courses = parallelResults.course.status;
        }
        else {
          result.courses = courses;
        }

        
        var avatarEndTime = ( parallelResults.avatar && parallelResults.avatar.time ) || Date.now();

        //affinity
        result.timing.affinity_avatar = avatarEndTime - avatarStartTime;

        if ( avatarToken ) {
          result.profile.avatar = "/images/person.png?access_token=" + encodeURIComponent( avatarToken );
          result.tokens.affinity_access_token = avatarToken;
        }

        logger.log("debug3", "Toolbar result", result);
        resultCallback( false, { statusCode: 200 }, result );
      } );
  } );

  var buildConfig = function buildConfig( result ) {
    var uiConfig = result.institution.is_social ? nconf.get( "socialConfig" ) : nconf.get( "openClassConfig" );

    result.config = _.extend( result.config, uiConfig );

    logger.log( 'debug2', 'CONFIG' + JSON.stringify( uiConfig ) );

  };

  var affinityIdFromToken = function affinityIdFromToken( token ) {
    var regex = AFFINITY_TOKEN_REGEX;
    var match = token.match( regex );
    var splitIndex = regex.toString().indexOf( "=" ) || 0;
    return (match && match.length === 1) ? match[0].substring( splitIndex ) : null;
  };

  var getAlias = function ( identityId, token, callback ) {
    var timer = metrics.timer( 'toolbar.server.data.alias' );
    alias.getAffinityId( identityId, token, function ( error, result ) {
      timer.end();
      if ( error ) {
        logger.log( "error", "Get Alias Affinity Id call failed: ", error );
      }

      callback( false, { affinityId: result, status: 'error' } );
    } );
  };

  var getAvatar = function getAvatar( token, callback ) {
    var timer = metrics.timer( 'toolbar.server.data.affinityAvatarUrl' );

    try {
      wsod.getAffinityAvatarUrl( token, function ( error, data ) {
        timer.end();
        var time = Date.now();

        if ( !error ) {
          logger.log( "debug1", "Affinity get avatar url successful", data );
          callback( false, { access_token: data.access_token, time: time } );
        }
        else {
          logger.log( "error", "Affinity call failed: " + error + ", data: " + data );
          // This affinity call shouldn't cause the whole call to fail
          callback( false, { access_token: null, time: time } );
        }
      } );
    }
    catch ( err ) {
      logger.log( "error", "Affinity get avatar url error" + err );
      callback( false, { access_token: null, time: Date.now() } );
    }
  };

  // This is only for the test harness, a pass through to generate a windmill token.
  app.get( '/auth', function ( req, res ) {
    var email = req.query.email;
    var password = req.query.password;
    var resultCallback = callback.resultCallback( req, res );
    logger.log( "debug1", "GET /auth request ", req.query );

    windmill.token( email, password, resultCallback );
  } );
  
  app.get( '/exchange', function ( req, res ) {
  	
  	var exchangeUrl = "https://exchange.pearsonopenclass.com/api/catalogs/exchange/catalogItems";
  	var limit= req.query.limit;
  	var offset=req.query.offset;
  	var query= req.query.query;
	var token = req.token || req.headers["x-authorization"] || req.query.token;
	console.log(req.token, req.headers["x-authorization"],  req.query.token)	
	var qsParams = querystring.stringify( { limit:limit, offset:offset, query:query } );
    var requestOptions = {
        url: exchangeUrl + "?" + qsParams,
        timeout: 3000,
        headers: {
          "X-Authorization": token
        }
      };
      request( requestOptions, function ( error, response, body ) {
      	console.log(body);
        if ( error ) {
          return res.send(error);

        }
        if ( response.statusCode === 200 ) {

 			return res.send(body);
        }
        
      } );
  } );
  
   app.post( '/course/content', function ( req, res ) {

  	
  	var courseContentUrl = "https://mycourse-api.pearsonopenclass.com/menus/7548593/items/85725697/composite/next";
  	var data = '';
    req.on('data', function (chunk) {
        data += chunk;
    });
	req.on('end', function () {

	      console.log(data);
	      var token = req.headers["x-authorization"];
	      var requestOptions = {
	        uri: courseContentUrl,
	        method: 'POST',
	        timeout: 30000,
	        json: JSON.parse(data),
	        headers: {
	          "X-Authorization": token
	        }
	    };
		request( requestOptions, function ( error, response, body ) {
	      	console.log(body);
	        if ( error ) {
	          return res.send(error);
	
	        }
	        if ( response.statusCode === 201 ) {
	
	 			return res.send(body);
	        }
	        
	      } );
	 	}); 	
 
  } );
};
