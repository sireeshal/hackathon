var https = require( 'https' );
var request = require( 'request' );
var logger = require( './logger.js' );
var _ = require( 'underscore' );
var nconf = require( 'nconf' );

var NOTIFICATIONS_ROOT_URL = nconf.get( 'socialConfig:notifications_root_url' );

var self = module.exports;


/**
 * Get all notifications
 *
 * @param token
 * @param affinityId
 * @param callback A function of the form fn(err, results)
 */
self.getAll = function ( token, affinityId, callback ) {
	var headers = {
		"x-authorization": token
	};

	var url = NOTIFICATIONS_ROOT_URL + "/notifications/all/user/" + affinityId;

	var options = {
		uri:     url,
		method:  "GET",
		json:    true,
		headers: headers,
		timeout: 5000
	};

	logger.log( "debug1", 'Notifications getAll request ', options );

	request( options,
		function ( error, response, body ) {
			try {
				if ( Array.isArray( body.data.notifications ) ) {

					body.data.notifications.sort( function ( a, b ) {

						// if both read or both unread, sort by date
						if ( a.read == b.read ) {
							if ( new Date( a.created ) < new Date( b.created ) ) {
								return 1;
							}
							else {
								return -1;
							}
						}
						else if ( a.read ) {
							return 1;
						}
						else {
							return -1;
						}

					} );

				}
			}
			catch ( e ) {
				// not a big deal if sorting fails
			}

			callback( error, response, body );
		}
	);

};

function parseJsonBody( error, response, body ) {
	if ( !error && response.headers["content-type"].indexOf( "application/json" ) === 0 ) {
		return JSON.parse( body );
	}
	else {
		return body;
	}
}
