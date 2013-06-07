var googleConsumer  = require('../lib/googleConsumer.js');
var Prospero = require('eclg-prospero');
var callback = require('../lib/callback.js');
var middleware = require('eclg-node-middleware');
var logger = require('../lib/logger.js');
var nconf = require('nconf');

module.exports = function(app)  {
	var Toolbar = app.set('Toolbar');
	var prospero = (nconf.get("PROSPERO_ENABLED")) ? new Prospero(nconf.get("prosperoConfig")) : {};
	var ifAuthorized = app.set('ifAuthorized');

	/*
	*  Fetch google consumer account definitions from config.js
	*
	*  __return__ Google client definitions object
	*/
	app.get( '/google-consumer-object', middleware.consumer.whoMe(), ifAuthorized, function( req, res, next ) {
		var resultCallback = callback.resultCallback(req, res);

		logger.log("debug1", "GET /google-consumer-object request: ", req.query);

		googleConsumer.getConfig(function( error, result ) {
			logger.log("debug1", "GET /google-consumer-object response: ", result);
			resultCallback( false, { statusCode: 200 }, result );
		});
	});

	/*
	*  Fetch Google Consumer access and refresh tokens
	*
	*   __param__  code ( from Google )
	*   __return__ Google access token object
	*/
	app.get( '/google-get-consumer-token', middleware.consumer.whoMe(), ifAuthorized, function( req, res, next ) {
		var resultCallback = callback.resultCallback(req, res);
		var code = req.query.code;

		logger.log("debug1", "GET /google-get-consumer-token request ", req.query);

		googleConsumer.getTokens( code, function( error, result, response ) {
			if( error ) {
				logger.log("error", "GET /google-get-consumer-token error ", error);
				resultCallback( error, { statusCode: "400"}, result );
			}
			else {
				logger.log("debug1", "GET /google-get-consumer-token response ", response);
				resultCallback( false, { statusCode: "201" }, result );
			}
		});
	});

	/*
	*  Save Google Consumer access and refresh tokens
	*  VIA Chamber service
	*
	*   __param__  token
	*   __param__  refresh_token
	*   __param__  expires_in
	*   __param__  email
	*   __param__  whittaker token
	*/
	app.get( '/google-save-consumer-token', middleware.consumer.whoMe(), ifAuthorized, function( req, res, next ) {
		var resultCallback = callback.resultCallback(req, res);
		logger.log("debug1", "GET /google-save-consumer-token request ", req.query);

		var putObj = {
			access_token: req.query.access,
			refresh_token: req.query.refresh,
			email: req.query.email,
			expires_in: req.query.expires_in,
			config: {
				chamber_url: nconf.get("CHAMBER_ROOT_URL"),
				whit_token: req.query.token
			}
		};
		var dataObj = {};

		googleConsumer.putChamber( putObj, function( error, result, response ) {
			if( error ) {
				logger.log("error", "Error occurred in saving consumer token in Chamber failed ", error);
				dataObj.method = 'remove';
			//googleConsumer.whitCredential( dataObj, function( error, result, response ) {} );
			if( error === 'connect ECONNREFUSED' )
				resultCallback( "unauthorized", { statusCode: "401"}, null );
			else if ( error === 'error' )
				resultCallback( 'error', { statusCode: result }, response );
			else
				resultCallback( response, { statusCode: result }, null );
			}
			else {
				dataObj = {
					method: "save",
					url: nconf.get("WHITTAKER_CONSUMER_ROOT_URL"),
					id: req.me.identityId,
					email: req.query.email,
					token: req.token
				};

				logger.log("debug1", "Google create credential save data ", dataObj);

				googleConsumer.whitCredential( dataObj, function( whit_error, whit_result, whit_response ) {
					if( whit_error ) {
						//try to remove chamber record. if it fails for some reason, just return the whit error
						logger.log("error", "Error occured creating whitaker google credential ", whit_error);
						googleConsumer.chamberDelete( putObj.config, function( error, result, response ) {} );
						resultCallback( whit_result.data.message, { statusCode: whit_result.code, data: whit_result.message }, whit_result );
					}
					else {
						//resultCallback(false, { statusCode: whit_result.code, data: whit_result.message } );
						logger.log("debug1", "Error occured creating whitaker google credential ", whit_error);
						sendSuccessUserAssociatedMessage(req.me, req.query.email);
						resultCallback(false, { statusCode: response.statusCode } );
					}
				});
			}
		});
	});

function sendSuccessUserAssociatedMessage(me, email) {
	if (!nconf.get("PROSPERO_ENABLED")) return;

	var message = {
		messageType: 'Google.UserAccount.Associated',
		payloadContentType: 'application/json',
		payload: {
		identityId: me.identityId,
		consumerEmail: email
	},
		client: me.institutionSlug,
		clientString: me.institutionId,
		system: 'OpenClass',
		subSystem: 'GoogleToolbar',
		realm: 'Toolbar'
	};

	logger.log("debug2", 'sendSuccessUserAssociatedMessage: ', message);

	prospero.publish(message, function(error, result) {
		if (error)
			return logger.log("error", 'Google.UserAccount.Associated message failed: ' + error);
		if(result.statusCode === 200)
			logger.log("debug2", 'Google.UserAccount.Associated message sent id: ', result.data.message.id);
	});
}

	/*
	 *  Remove user from chamber service
	 */
	app.get( '/google-remove-user', middleware.consumer.whoMe(), ifAuthorized, function( req, res, next ) {
		var resultCallback = callback.resultCallback(req, res);
		logger.log("debug1", "GET /google-remove-user request: ", req.query);

		var deleteObj = {
			chamber_url: nconf.get("CHAMBER_ROOT_URL"),
			whit_token: req.query.token
		};

		var error = null;
		var result = null;

		logger.log("debug1", "Google Delete Whitaker credential in delete data: ", deleteObj);
		var deleteWhitCred = function( callback ) {
			var dataObj = {
				method: "remove",
				url: nconf.get("WHITTAKER_CONSUMER_ROOT_URL"),
				id: req.me.identityId,
				email: req.query.email,
				token: req.token
			};

			googleConsumer.whitCredential( dataObj, function( error, result, response ) {
				if( error ) {
					logger.log("error", "Remove whitaker credential error: " + error );
					callback( error, result );
				}
				else {
					logger.log("debug1", "Remove whitaker credential sucessful");
					callback( false, null );
				}
			});
		};

			//var whit_result = null;
			deleteWhitCred( function( whit_error, whit_result ){
				if( whit_error ){
					logger.log("error", 'delete whittaker cred error', whit_error );
					return resultCallback( whit_result.data.message, { statusCode: "400", data: whit_error }, whit_result.data );
				}
				googleConsumer.chamberDelete( deleteObj, function( error, result, response ) {
					if( error ) {
						logger.log("debug1", "Delete chamber error", error);
						if( error === 'connect ECONNREFUSED' )
							resultCallback( "unauthorized", { statusCode: "401", data: whit_error}, result );
						else
							resultCallback( error, { statusCode: response.code, data: whit_error }, null );
					}
					else {
						if( response.code == 200 ) {
							logger.log("debug1", "Delete chamber successful");
							resultCallback(false, { statusCode: response.statusCode, data: whit_error }, result );
						}
						else {
							logger.log("debug1", "Delete chamber record not found");
							resultCallback( "not-found", { statusCode: "404", data: whit_error}, result );
						}
					}
			});
		});
	});

	/*
	*  Loads Google Consumer authentication success page
	*
	*
	*/
	app.get( '/google-authorize-success', function( req, res, next ) {
		logger.log("debug1", "GET /google-authorize-success request: ", req.query);
		googleConsumer.getSuccessPage( req, res );
	});

	/*
	*  Get Google Code
	*
	*
	*/
	app.get( '/google-code', middleware.consumer.whoMe(), ifAuthorized, function( req, res, next ) {
		var resultCallback = callback.resultCallback(req, res);
		var key = req.query.key;
		logger.log("debug1", "GET /google-code request: ", req.query);

		Toolbar.findOne({
			key: key
			}, function(err, doc) {
				if (err) {
					logger.log("error", "Toolbar find google code error " + err);
					return resultCallback(err, { statusCode: '400' }, key );
				}
				if (!doc) {
					logger.log("debug1", "Toolbar find google code not found");
					return resultCallback(err, { statusCode: '404' }, key );
				}

		try {
			var doc = doc.toObject();
			var code = doc.code;
			logger.log("debug1", 'Toolbar google code found', code );
			resultCallback(false, { statusCode: '200' }, code );
			var removeDoc = function( code ){
				Toolbar.findOne({
				code: code
				}, function(err, doc) {
					if (err) return;
					if (!doc) return;

					try {
						doc.remove({});
					} catch (err) {
						logger.log("error", 'google-code remove doc error ' + err );
					}
				});
			};

			var removeOldDocs = function(){
				var oldRecsMs = Date.now() - 300000; //5 minutes ago
				Toolbar.find({
					timestamp : { $lte :oldRecsMs }
					}, function(err, docs) {
					if (err) return;
					if (!docs) return;

					try {
						docs.forEach( function(doc){
							doc.remove({});
						});
					} catch (err) {
						logger.log("error", 'google-code remove old docs error ' + err );
					}
				});
			};

		removeDoc( code );
		removeOldDocs();
		} catch (err) {
			logger.log("error", 'Exception in google-code remove doc/docs error' + err );
			resultCallback(err, { statusCode: '400' }, key );
		}
		});
	});

	/*
	*  Save Google Code
	*
	*
	*/
	app.get( '/google-code-add', middleware.consumer.whoMe(), ifAuthorized, function( req, res, next ) {
		var code = req.query.code;
		var key = req.query.key;
		logger.log("debug1", "GET /google-code-add request: ", req.query);

		Toolbar.findOne({
			key: key
		}, function(err, doc) {
			var saveDoc = function() {
				doc = doc || new Toolbar();
				doc.key = key;
				doc.code = code;
				doc.timestamp = Date.now();
				doc.save(function(err) {
				if (err) {
					logger.log("error", 'google-code-add error' + err);
					return res.send( '' );
				}
				else return res.send( '' );
				});
			};
			saveDoc();
		});
	});
};
