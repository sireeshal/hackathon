var statsd = require('../lib/middleware/statsd');
var nconf = require('nconf');
var logger = require('../lib/logger.js');
var metrics = require('../lib/statsd');
var url = require('url');

module.exports = function(app) {

    app.get(/^\/log\/client\/.*/, statsd('log.client'), function(req, res) {

        //short term solution - new toolbar will do it differently
        var parsedUrl = url.parse(req.url);
        var routes = parsedUrl.pathname.replace('/log/client/', '').split('/');

        var error = decodeURIComponent(routes[0] || '');

        if (error != '')
            logger.log('error', 'client error: '+ error);

        res.send(200, { message: "success"});

    });

};