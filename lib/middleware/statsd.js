var metrics = require('../statsd');

module.exports = function statsdResponseTime(routeName){
    return function(req, res, next){

        if (res._statsdTimer) return next();
        var statsdName = 'toolbar.server.route.' + routeName;
        res._statsdTimer = metrics.timer(statsdName);

        res.on('header', function(header){
            if (res._statsdTimer) res._statsdTimer.end();
        });

        next();
    };
};