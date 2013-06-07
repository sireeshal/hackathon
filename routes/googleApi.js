var googleEmail = require('../lib/googleEmail.js');
var googleCalendar = require('../lib/googleCalendar.js');
var google = require('eclg-google-service-client');
var callback = require('../lib/callback.js');
var logger = require('../lib/logger.js');
var statsd = require('../lib/middleware/statsd');

module.exports = function(app) {
	var ifAuthorized = app.get('ifAuthorized');
	var middleware = app.get('middleware');
	var googleOAuth = app.get('googleOAuth');

	googleEmail.init(googleOAuth);
	googleCalendar.init(googleOAuth);
	google.init(googleOAuth);

	app.get('/google/email/unread',  middleware.consumer.whoMe(), ifAuthorized, statsd('google.email'), function(req, res, next) {
		var resultCallback = callback.resultCallback(req, res);
		logger.log("debug1", "GET /google/email/unread request", req.query);
		googleEmail.unreadFeed(req.me.googleUserType, req.token, req.me.email, resultCallback);
	});

	app.get('/google/docs', middleware.consumer.whoMe(), ifAuthorized, statsd('google.docs'), function(req, res, next) {
		var resultCallback = callback.resultCallback(req, res);
		logger.log("debug1", "GET /google/docs request", req.query);
		var dataObj = {
			googleUserType: req.me.googleUserType,
			token: req.token,
			email: req.me.email
		};
		google.docs.feed(dataObj, resultCallback);
	});

	app.get('/google/calendar', middleware.consumer.whoMe(), ifAuthorized, statsd('google.calendar'), function(req, res, next) {
		var resultCallback = callback.resultCallback(req, res);
		logger.log("debug1", "GET /google/calendar request", req.query);
		var dataObj = {
			googleUserType: req.me.googleUserType,
			token: req.token,
			email: req.me.email
		};
		googleCalendar.feed(dataObj, resultCallback);
	});
};