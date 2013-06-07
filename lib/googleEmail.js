/**
 * Google Email (gmail) APIs calls
 *
 * @author Mike Brevoort
 */

var util        = require('util')
  , https       = require('https')
  , http        = require('http')
  , fs          = require('fs')
  , querystring = require('querystring')
  , hbs         = require('hbs')
  , xml2js      = require('xml2js')
  , prettyDate  = require('./prettyDate.js')
  , googleEmail = {}
  , logger		= require('./logger.js')
  , self        = module.exports = googleEmail;

self.googleOAuth = {};

self.init = function(oAuth) {
    self.googleOAuth = oAuth;
}

self.GOOGLE_NEW_EMAIL_FEED_URL = "https://mail.google.com/mail/feed/atom/?xoauth_requestor_id={{email}}";
self.GOOGLE_NEW_EMAIL_FEED_URL_OAUTH2 = "https://mail.google.com/mail/feed/atom/";

//https.getAgent({host:'mail.google.com'}).maxSockets = 100;

/**
 * @param email the email address of the user to make the call on behalf of
 *
 * @param callback(<boolean> successful, <object>result or error)
 *  The callback should expect two parameters as specified above.
 *
 */
self.unreadFeed = function(googleUserType, whittakerToken, email, callback) {
//	logger.log("debug1", "unreadFeed oauth:", googleOAuth);
  if(self.googleOAuth == null)
    throw("googleOAuth Library needs to be initialized");

  var startTime = new Date().getTime()
  var feedUrl = getFeedUrl(email);


  if (googleUserType === 'user')  {
    var requestObj = {
      url: self.GOOGLE_NEW_EMAIL_FEED_URL_OAUTH2,
      whit_token: whittakerToken,
      headers: {},
      method: "GET"
    };

    logger.log("debug2", 'google email unread feed oAuth2 request', requestObj);

    self.googleOAuth.oauth2Request( requestObj, function(error, data, response ) {
      self._oAuthCallback(error, data, response, callback);
    });
  }
  else {
    logger.log("debug2", 'google email unread feed oAuth1 request ' + feedUrl);
    self.googleOAuth.oauth1Get(feedUrl, function(error, data, response){
     self._oAuthCallback(error, data, response, callback);
    });
  }

}

self._oAuthCallback = function (error, data, response, callback) {
  if(!error) {
    //logger.log("info", "Email Feed for " + email + " took " + (new Date().getTime() - startTime) + "ms - URL: " + feedUrl);
    //Metrics.emit("update", {name: 'toolbar.google.email', val: (new Date().getTime() - startTime) });

    // parse the XML into JSON
    var parser = new xml2js.Parser();
    parser.addListener('end', function(parsed) {

      // start to built an abbreviated, flattened result object
      var result = {
        link:         parsed.link["@"].href,
        updated:      parsed.modified,
        fullcount:    parsed.fullcount,
        items: []
      };

      if(parsed.entry) {
        // in the case where there is a single entry, replace the single entry
        // object with an array
        var entries = [];
        if(!parsed.entry.length) {
          entries.push(parsed.entry);
          parsed.entry = entries;
        }
        // iterate through all fo the entries, to create flattened items
        // TODO make async
        parsed.entry.forEach(function(entry) {
        entry.link = entry.link["@"].href;
        // add the pretty time ago style date to each result
        entry.prettydate = prettyDate.pretty(entry.issued) || "";
        result.items.push(entry);
      });
    }

    // call back 1st parameter falsey no error
    callback(false, response, result);
  });
  parser.parseString(data);
}
else {
    // call back 1st parameter truthy if error
    logger.log("error", "googleEmail request error", error);
    callback(error, response);
  }
}
// broken out for testing
var getFeedUrl = self.getEmailFeelUrl = function(email) {
    // use handlebars to inject the email address into the URL specified in the config
    // eg "https://mail.google.com/mail/feed/atom/?xoauth_requestor_id={{email}}"
    return hbs.compile(self.GOOGLE_NEW_EMAIL_FEED_URL)({ blockHelpers: { email: querystring.escape(email) }});
}
