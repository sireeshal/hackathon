var nock = require('nock');
var should = require('should');
var express = require('express');
var request = require('request');
var nconf = require('nconf');
var middleware = require('eclg-node-middleware');
var googleOAuth = require('eclg-google-oauth').googleOauth;
var wsod = require('../../lib/wsod.js');

nconf.file({file:__dirname +'/../../config.json'});

var port = 22222;
var rootUrl = 'http://localhost:' + port;
var token = '1.0|idm|idm|affinity=berlin_4f9ff07100c40fc408d497de&berlin=4f9ff07050ad7e8f0f64295b&campus=berlin:4f9ff07100c40fc408d497de|2012-05-29T16:29:14+00:00|2012-05-29T19:29:14+00:00|7bf23345e60ab503c8cadc3f49eb4639';

var googleOauthObj = {
    chamberRootUrl:                   nconf.get('CHAMBER_ROOT_URL'),
    googleRootRefreshUrl:             nconf.get('GOOGLE_ROOT_REFRESH_URL'),
    rootUrl:                          nconf.get('WHITTAKER_ROOT_URL'),
    oauth1ClientId:                   nconf.get('GOOGLE_OAUTH1_CLIENT_KEY'),
    oauth1ClientSecret:               nconf.get('GOOGLE_OAUTH1_CLIENT_SECRET'),
    oauth2ClientId:                   nconf.get('GOOGLE_OAUTH2_CLIENT_KEY'),
    oauth2ClientSecret:               nconf.get('GOOGLE_OAUTH2_CLIENT_SECRET')
}
googleOAuth.init( googleOauthObj );
middleware.consumer.init( googleOauthObj );

wsod.init({
    mServiceRoot:                   nconf.get('WSOD_M_ROOT_URL'),
    phServiceRoot:                  nconf.get('WSOD_PH_ROOT_URL'),
    affinityPersonaServiceRoot:     nconf.get('AFFINITY_PERSONA_ROOT_URL'),
    clientId:                       nconf.get('WSOD_CLIENT_ID')
});

// Server setup
var app = express();
app.configure(function () {
    //setup tokens for request
    app.use(function (req, res, next) {
        req.query.whit_access_token = token;
        next();
    });
    app.set('middleware', middleware);
    app.set('wsod', wsod);
    app.set('ifAuthorized', function(req, res, callback) { return callback(); } );
    app.use(app.router);
});

// Load media route.
require('../../routes/data')(app);
app.listen(port);

var openClassConfig = nconf.get("openClassConfig");

describe('toolbar data', function() {
    var scope;
    var chamberScope;
    var assertionScope;
    var sessionScope;
    var coursesScope;

    before(function(){
        scope = nock('https://admin.pearsonopenclass.com')
            .get('/service/me.json')
            .replyWithFile(200, __dirname + '/../data/whitaker.me.isNursing.json', {'Content-type': 'application/json'});
        chamberScope = nock(nconf.get('CHAMBER_ROOT_URL'))
            .get('/me/google_oauth2')
            .reply(404, { code: 404, status: 'success', data: {} }, {'Content-type': 'application/json'});
        assertionScope = nock(nconf.get('WSOD_M_ROOT_URL'))
            .get('/me/affinityAssertion')
            .reply(200, { affinityAssertion: { assertion: '1234' } }, {'Content-type': 'application/json'});
        sessionScope = nock(nconf.get('AFFINITY_PERSONA_ROOT_URL'))
            .get('/Affinity/v1/session?Authorization=1234')
            .reply(200, { affinityToken: '12345'  }, {'Content-type': 'application/json'});
        coursesScope = nock(nconf.get('WSOD_M_ROOT_URL'))
            .get('/me/courses?expand=course')
            .reply(200, { courses: []  }, {'Content-type': 'application/json'});
    });

    it('should contain nursing behavior and config', function(done){
        var url = rootUrl + '/toolbar?token=' + token;
        request.get(url, function (error, response, result) {
            result = JSON.parse(result);
            var data = result.data;
            should.strictEqual(null, error);
            should.exist(result);
            should.strictEqual('success', result.status);
            should.strictEqual(openClassConfig.dashboard_url, data.config.dashboard_url);
            should.strictEqual(openClassConfig.profile_url, data.config.profile_url);
            should.strictEqual(openClassConfig.admin_url, data.config.admin_url);
            should.strictEqual(nconf.get('READYPOINT_HELP_URL'), data.config.help_url);
            data.institution.is_nursing.should.be.true;
            done();
        });
    })
});