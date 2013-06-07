/**
 * Contains wrapped calls to windmill (aka whittaker IDM)
 * @author Mike Brevoort
 */
var util        = require('util')
  , https       = require('https')
  , http        = require('http')
  , fs          = require('fs')
  , querystring = require('querystring')
  , hbs         = require('hbs')
  , request     = require('request');


exports.init = function(serviceRoot) {
  this.SERVICE_ROOT = serviceRoot;
  return this;
};

exports.token = function(email, password, callback) {
    // TODO replace this hardcoded person Id with "me"
  var url = this.SERVICE_ROOT + "/identity/login/basic";
  var options = {
    uri:url,
    method: "POST",
    json: {
      email: email,
      password: password
    }
  };

  logger.log("debug2", 'windmill token request ', options);

  request(options,
      function(error, response, body) {
          callback(error, response, (error ? body : JSON.parse(body)));
      }
  );
};

