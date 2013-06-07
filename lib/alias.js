var nconf = require( 'nconf' );
var request = require( 'request' );
var logger = require( './logger.js' );

module.exports = function ( app ) {
  var alias = {};

  var windmill = app.get( 'windmill' );
  var superAdmin = nconf.get( 'GOOGLE_SUPER_ADMIN' );
  var aliasUrl = nconf.get( 'ALIAS_ROOT_URL' );

  alias.getAffinityId = function getAffinityId( identityId, token, done ) {

    windmill.getAssertionToken( superAdmin, function ( error, token ) {
      if ( !token ) {
        logger.log( 'error', 'failed to get super admin token to request alias lookup for identityId: ' + identityId );
        return done( true );
      }

      var requestOptions = {
        url: aliasUrl + '/user/identity/' + identityId,
        timeout: 3000,
        headers: {
          "X-Authorization": token
        }
      };

      logger.log( 'debug2', 'Alias request', requestOptions );

      request( requestOptions, function ( error, response, body ) {
        if ( error ) {
          logger.log( 'error', 'alias lookup returned an error ' + error );
          return done( true );
        }

        if ( response.statusCode === 200 ) {
          logger.log( 'debug1', ['alias body', body] );

          body = JSON.parse( body );
          var affinityId = body && body.data && body.data.affinity;

          if ( affinityId ) {
            logger.log( 'info', 'alias returned affinity ID ' + affinityId + ' for campus ID ' + identityId );
            done( false, affinityId );
          }
          else {
            logger.log( 'warning', 'alias returned no affinity ID for campus ID ' + campusId );
            return done( true );
          }

        }
        else {
          return done( true );
        }

      } );
    } );
  };

  return alias;
};
