var async = require('async');
var request = require('request');

/**
 * Issues a set of parallel http(s) requests. Calls a single callback when all requests are complete (errored or otherwise).
 *
 * @param token The authentication token for the api. This is automatically inserted into the x-authorization header of the request
 * @param shots An array of "shot" objects, where each shot is an options object suitable for passing to request() module
 * @param callback A callback to be called
 */
module.exports = function (token, shots, callback) {

	// error checking
	if (!token || typeof(token) != 'string' || token.length < 1) {
		process.nextTick(function () {
			callback('no token supplied', undefined);
		});
		return;
	}

	// ready!
	shots = shots || [];
	var tasks = [];
	for (var i = 0; i < shots.length; i++) {

		// aim!
		tasks.push(buildShot(token, shots[i]));
	}

	// optimization
	if (!shots.length || shots.length < 1) {
		process.nextTick(function () {
			callback(undefined, []);
		});
		return;
	}

	// clamp
	if (typeof(callback) != 'function') {
		callback = function (err, result) {
			// NO-OP, can you dig it?
		};
	}

	// fire!
	async.parallel(tasks, function (err, result) {

		// recoil!
		process.nextTick(function () {

			// parallel does not break up callback into separate exec block, so we will
			callback(err, result);
		});

	});

};

/**
 * Compiles the shot options into an executable function suitable for passing to async.parallel().
 *
 * @param token The auth token for the request
 * @param shot The options object to pass to the request library
 * @return {Function} of the form fn(callback){}
 */
function buildShot(token, shot) {

	return function (callback) {

		// clamp
		if (typeof(shot) == 'string') {
			shot = {
				url: shot
			};
		}

		// default options
		var defaultShot = {
			url: false,
			timeout: 5000,
			headers: { "x-authorization": "Access_Token access_token=" + token }
		};

		// merge user shot into default shot
		for (var field in shot) {
			if (shot.hasOwnProperty(field)) {
				defaultShot[field] = shot[field];
			}
		}

		// error checking
		if (!defaultShot.url) {
			shotError("no url supplied", callback);
			return;
		}
		if (!defaultShot.timeout || defaultShot.timeout < 500) {
			shotError("timeout cannot be less than 500 ms: " + defaultShot.timeout, callback);
			return;
		}
		if (!defaultShot.headers || !defaultShot.headers["x-authorization"]) {
			shotError("no x-authorization header present", callback);
			return;
		}

		// no errors, issue call
		request(defaultShot,
			function (error, response, body) {

				// exec break for callback
				process.nextTick(function () {
					callback(false, {
						error: error,
						response: response,
						body: body
					});
				});

			}
		);


	};

}

/**
 * Utility for issuing error return to shot callback.
 *
 * @param error The error string to return
 * @param callback The callback to send the error to
 */
function shotError(error, callback) {
	process.nextTick(function () {
		callback(false, {
			error: error,
			response: undefined,
			body: undefined
		});
	});
}
