var logger = require('../lib/logger.js');
var statsd = require('../lib/middleware/statsd');

module.exports = function(app) {
	var wsod = app.set('wsod');

	// Proxy the affinity images, if we can get the image from affinity, stream it back
	// otherwise call next() to defer to the default profile image served from the static
	// route. TODO: revaluate this approach, not very happy doing this
	app.get('/images/person.png', statsd('avatar.person'), function(req, res, next) {
		var token = req.query.access_token;
		logger.log("debug1", "GET /images/person.png request", req.query);
		wsod.streamAffinityAvatar(token, res, next);
	});
};
