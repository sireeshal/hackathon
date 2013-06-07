// expects NPM libs for express, hbs, oauth
var util        = require('util')
  , https       = require('https')
  , http        = require('http')
  , fs          = require('fs')
  , querystring = require('querystring')
  , hbs         = require('hbs')
  , logger 		= require('./logger.js')
  , request     = require('request');


exports.init = function(serviceRoot) {
  this.SERVICE_ROOT = serviceRoot;
  return this;
}

exports.me = function(token, callback) {
  // TODO replace this hardcoded person Id with "me"
  var url = this.SERVICE_ROOT + "/me.json";
  var options = {
      uri:url,
      headers: { "x-authorization": token },
      timeout: 5000
  };

  logger.log("debug2", 'whittaker me request', options);
  request(options,
      function(error, response, body) {
          callback(error, response, (error ? body : JSON.parse(body)));
      }
  );
};

exports.insitution_publicinfo = function(slug, callback) {
  // TODO replace this hardcoded person Id with "me"
  var url = this.SERVICE_ROOT + "/institution/slug/" + slug + "/publicinfo.json";
  var options = {
      uri:url,
      timeout: 5000
  };

  logger.log("debug2", 'whittaker insitution_publicinfo request', options);
  request(options,
    function(error, response, body) {
        callback(error, response, (error ? body : JSON.parse(body)));
    }
  );
};


