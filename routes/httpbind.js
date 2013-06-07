var proxy = require('../lib/proxy.js');
var logger = require('../lib/logger.js');
var nconf = require('nconf');

module.exports = function(app) {
	// proxying route for XMPP
	app.all('/http-bind*', function(req, res, next) {
		//logger.log("debug1", "ALL /http-bind*' request", req.query);
		var xmppUrl =nconf.get("XMPP_ROOT_URL");
		if(xmppUrl)
			proxy(xmppUrl, req, res);
		else
			next();
	});
};