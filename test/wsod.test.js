var assert = require('assert')
  , querystring = require('querystring')
  , http = require('http')
  , util = require('util')
  , request = require('request')
  , config = require('../config.js');

var wsodConfig = {
    mServiceRoot:   config.WSOD_M_ROOT_URL,
    phServiceRoot:  config.WSOD_PH_ROOT_URL,
    affinityPersonaServiceRoot: config.AFFINITY_PERSONA_ROOT_URL,
    clientId:       config.WSOD_CLIENT_ID
};

var wsod = require('./../lib/wsod.js').init(wsodConfig);

exports['verify config.js completeness'] = function() {

    // verify that the config is present
    assert.isDefined(config.WSOD_M_ROOT_URL);
    assert.isDefined(config.WSOD_PH_ROOT_URL);
    assert.isDefined(config.WSOD_CLIENT_ID);
    assert.isDefined(config.WSOD_USER);
    assert.isDefined(config.WSOD_PASSWORD);
};

exports['test wsod token'] = function() {

    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        assert.ok(!error);
        assert.equal("200", response.statusCode);
        assert.isDefined(body);
        assert.isDefined(body.access_token);
        assert.isDefined(body.refresh_token);
        assert.isDefined(body.expires_in);
    });

};

exports['negative test wsod token'] = function() {

    wsod.token(config.WSOD_USER, "bogus", function(error, response, body) {
        assert.ok(!error);
        assert.equal("400", response.statusCode);
    });

};

exports['test course list'] = function() {

    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        var token = body.access_token;

        wsod.courses(token, function(error, response, body) {
            assert.ok(!error);
            assert.equal("200", response.statusCode);
            assert.isDefined(body);
            assert.isDefined(body.courses);
            assert.isDefined(body.courses.length);
        });
    });

};

exports['test windmill token exchange'] = function() {
    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        var token = body.access_token;

        wsod.windmillTokenExchange(token, function(error, resposne, body) {
            console.log("windmill token exchange call" + util.inspect(body));
            assert.ok(!error);
            assert.equal("200", response.statusCode);
            assert.isDefined(body);                 
            assert.isDefined(body.windmill_token);
            assert.isDefined(body.windmill_token.access_token);
            assert.isUndefined(body.error);
        });
    });
};

exports['test affinity assertion'] = function() {

    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        var token = body.access_token;

        wsod.affinityAssertion(token, function(error, response, body) {
            assert.ok(!error);
            assert.equal("200", response.statusCode);
            assert.isDefined(body);
            assert.isDefined(body.affinityAssertion);
            assert.isDefined(body.affinityAssertion.assertion);
        });
    });
};

exports['test affinity token'] = function() {

    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        assert.isDefined(body.access_token);
        var token = body.access_token;

        wsod.affinityAssertion(token, function(error, response, body) {
            assert.isDefined(body.affinityAssertion.assertion);
            var assertion = body.affinityAssertion.assertion;

            wsod.affinitySession(assertion, function(error, response, body) {
                assert.ok(!error);
                assert.equal("200", response.statusCode);
                assert.isDefined(body);
                assert.isDefined(body.affinityToken);
                console.log("token: " + body.affinityToken);
            });
        });
    });
};


exports["test affinity id from token"] = function() {
    var token = "ciu_autostud1:1307725421088:a7f522f1ea05528a3264be06c20f161f";
    var expectedUserId = "ciu_autostud1";
    var userId = wsod.affinityIdFromToken(token);
    assert.equal(expectedUserId, userId);
}

exports['test affinity avatar url'] = function() {

    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        assert.isDefined(body.access_token);
        var token = body.access_token;

        wsod.affinityAssertion(token, function(error, response, body) {
            assert.isDefined(body.affinityAssertion.assertion);
            var assertion = body.affinityAssertion.assertion;

            wsod.affinitySession(assertion, function(error, response, body) {
                var affinityToken = body.affinityToken;
                var avatarUrl = wsod.affinityAvatarUrl(affinityToken);
                console.log("avatarUrl: " + avatarUrl);
                assert.isDefined(avatarUrl);

                // now request the image and check the response
                request({ uri: avatarUrl }, function(error, response, body) {
                    assert.ok(!error);

                    assert.includes([200, 404], response.statusCode);
                    if(response.statusCode == 200)
                        assert.ok(response.headers["content-type"].indexOf("image/") === 0);
                });
            });
        });
    });
};

exports["test affinity avatar url wrapper"] = function() {
    
    wsod.token(config.WSOD_USER, config.WSOD_PASSWORD, function(error, response, body) {
        assert.isDefined(body.access_token);
        var token = body.access_token;


        wsod.getAffinityAvatarUrl(token, function(error, result) {
            assert.ok(!error);
            assert.isDefined(result.avatarUrl);
            assert.isDefined(result.access_token);
        });

        // there should be an error with a bogus token
        wsod.getAffinityAvatarUrl("bogus", function(error, avatarUrl) {
            assert.ok(error);
        });

    });

}


