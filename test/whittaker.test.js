var assert = require('assert')
  , querystring = require('querystring')
  , http = require('http')
  , util = require('util')
  , config = require('../config.js');



exports['test windmill token'] = function() {

    assert.isDefined(config.WINDMILL_ROOT_URL);
    assert.isDefined(config.WHIT_USER);
    assert.isDefined(config.WHIT_PASSWORD);

    var windmill = require('./../lib/windmill.js').init(config.WINDMILL_ROOT_URL);
    
    windmill.token(config.WHIT_USER, config.WHIT_PASSWORD, function(error, response, body) {
        assert.ok(!error);
        assert.equal("200", response.statusCode);
        assert.isDefined(body);
        assert.equal("200", body.code);
        assert.equal("success", body.status);
        console.log(body);
        assert.isDefined(body.data.authToken);
        assert.isDefined(body.data.refreshToken);
    });
};

///////////////////////////////////////////////////////////////////////////////
// Test enrollments
///////////////////////////////////////////////////////////////////////////////



// TODO - eliminated what is this hardcoded nightmare :#
exports['test whitaker enrollments'] = function() {

    assert.isDefined(config.WHITTAKER_ROOT_URL);
    assert.isDefined(config.WINDMILL_ROOT_URL);
    assert.isDefined(config.WHIT_USER);
    assert.isDefined(config.WHIT_PASSWORD);

    var whittaker = require('./../lib/whittaker.js').init(config.WHITTAKER_ROOT_URL);
    var windmill = require('./../lib/windmill.js').init(config.WINDMILL_ROOT_URL);

    windmill.token(config.WHIT_USER, config.WHIT_PASSWORD, function(error, response, body) {
        var token = body.data.authToken;
        assert.isDefined(token);

        whittaker.enrollments(token, function(error, response, body) {
            assert.ok(!error);
            assert.equal("200", response.statusCode);
            assert.isDefined(body);
            assert.equal("200", body.code);
            assert.isDefined(body.data);
            assert.equal(body.data.length, 1);
            assert.isDefined(body.data[0].personId);
        });

    });
};