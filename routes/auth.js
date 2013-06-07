var statsd = require('../lib/middleware/statsd');
var cb = require('../lib/callback');
var refreshments = require('refreshments');
var nconf = require('nconf');

module.exports = function(app) {

    refreshments.init({
        url: nconf.get('WHITTAKER_ROOT_URL')
    });

    app.get('/api/auth/refresh', statsd('auth.refresh'), function(req, res, next) {
        var refreshToken = req.refresh_token || req.query.refresh_token;

        function sendResponse(err, tokens) {
            var payload = {
                refreshed: tokens?true:false
            };
            if(tokens) {
                payload.token = tokens.auth;
                payload.refreshToken = tokens.refresh;
            }

            cb.resultCallback(req, res)(err, { statusCode:tokens?200:500}, payload);
        }

        if(refreshToken) {
            refreshments.refresh(refreshToken, function(err, tokens) {
                sendResponse(null, tokens);
            });
        }else {
            sendResponse();
        }

    });
};