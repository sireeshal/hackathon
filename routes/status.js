var os = require('os');
var path = require('path');
var nconf = require('nconf');
var async = require('async');

module.exports = function(app)  {
    var Toolbar = app.get('Toolbar');

    app.get('/status', function(req, res) {
        var packageInfo = require(path.join(process.cwd(), 'package'))

        getMongoStatus(function(error, status){
            res.send({
                name: packageInfo.name,
                version: packageInfo.version,
                buildMeta: packageInfo.buildMeta,
                nodeVersion: process.version.node,
                process: {
                    pid: process.pid,
                    memory: process.memoryUsage(),
                    uptime: process.uptime()
                },
                os: {
                    memory: os.freemem() + ' / ' + os.totalmem() + ' (free/total)',
                    uptime: os.uptime(),
                    hostname: os.hostname(),
                    cpus: os.cpus().length
                },

                dependencies: {
                    mongostatus: status
                }
            });
        });

    });

    var getMongoStatus = function getMongoStatus(callback) {
        var mongoTimeout = setTimeout(function () {
            console.log('mongo timeout');
            return callback(true, { status: 'red', message: 'mongo timeout' })

        }, 2000);

        try {
            Toolbar.findOne({
                key: 'status'
            }, function(err, doc) {
                var saveDoc = function() {
                    doc = doc || new Toolbar();
                    doc.key = 'status';
                    doc.code = 'status';
                    doc.timestamp = Date.now();
                    doc.save(function(err) {
                        clearTimeout(mongoTimeout);
                        if (err) callback(true, { status: 'red', message: err });
                        else callback(false, { status: 'green' });
                    });
                };
                saveDoc();


        });
        }
        catch(err)
        {
            callback(true, { status: 'red', message: err });
        }
    };

};