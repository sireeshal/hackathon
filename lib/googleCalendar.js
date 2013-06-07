/**
 * Google Calendar APIs calls
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
  , date        = require('date')
  , prettyDate  = require('./prettyDate.js')
  , googleCalendar = {}
  , logger		= require('./logger.js')
  , self        = module.exports = googleCalendar;

self.googleOAuth = {};


self.init = function(oAuth) {
  self.googleOAuth = oAuth;
}

self.GOOGLE_CALENDAR_FEED_URL = "https://www.google.com/calendar/feeds/default/private/full/?start-min={{start}}&start-max={{end}}&orderby=starttime&sortorder=a&singleevents=true&alt=jsonc&xoauth_requestor_id={{email}}";
self.GOOGLE_CALENDAR_LIST_V3_FEED_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
self.GOOGLE_CALENDAR_BYID_V3_FEED_URL = 'https://www.googleapis.com/calendar/v3/calendars/{{id}}/events';


self.feed = function( feedObj, callback ) {
  if(self.googleOAuth == null)
    throw ("googleOAuth Library needs to be initialized");

  var startTime = new Date().getTime();

  if (feedObj.googleUserType === 'user') {
    var requestObj = {
      url: self.GOOGLE_CALENDAR_LIST_V3_FEED_URL,
      whit_token: feedObj.token,
      headers: {},
      method: "GET"
    };

    logger.log("debug2", "google calendar feed oAuth2 request", requestObj);

    self.googleOAuth.oauth2Request( requestObj, function(error, data, response ) {
      try {
        var calendarIds = [];
        var parsed = JSON.parse( data );
      }
      catch( err ){
		logger.log('error', 'error parsing oauth2Request data in feed()', [data, error]);
        return;
      }

      logger.log("debug2", 'calendar parsed:', util.inspect(parsed));
      // brand new google user, havent signed up for calendar yet
      if ((parsed.error) && (parsed.error.code == "403")){
      	var response = {
      		statusCode:403,
      		message:parsed.error.message
      	}
      	return callback(true, response);
      }

      parsed.items.forEach( function( item ){
        calendarIds.push( item.id );
      } );

      var dataObj = {
        calendarIds: calendarIds,
        whittakerToken: feedObj.token
      }

      getCalendarEvents( dataObj, function( data ){
        dataObj = {
          error: error,
          data: data,
          response: response,
          email: feedObj.email
        }
        self._oAuth2Callback(dataObj, callback);
      } );
    } );
  }
  else {
    var feedUrl = getFeedUrl(feedObj.email);
    logger.log("debug2", "google calendar feed oAuth1 request " + feedUrl);
    self.googleOAuth.oauth1Get(feedUrl, function(error, data, response){
      self._oAuthCallback(error, data, response, feedUrl, callback);
    });
  }
};

var getCalendarEvents = function( dataObj, callback ) {
  var calendarCount = dataObj.calendarIds.length;
  var count = 0;
  var allEvents = [];
  var getEvents = function( url, cb ){
    var requestObj = {
      url: url,
      whit_token: dataObj.whittakerToken,
      headers: {},
      method: "GET"
    };

    logger.log("debug2", "google calendar getCalendarEvents oAuth2 request", requestObj);
    self.googleOAuth.oauth2Request( requestObj, function( error, data, response ) {

      try{
        var parsed = JSON.parse( data );
        parsed.url = url;
        cb( parsed );
      }
      catch( err ){
		    logger.log("error", "failed to parse response in getCalendarEvents", [data, err] );
        cb( {} );
      }
    });
  };
  dataObj.calendarIds.forEach( function( id ){
    var feedUrl = self._getOauth2FeedUrl( self.GOOGLE_CALENDAR_BYID_V3_FEED_URL, {
      id: id
    });

    getEvents( feedUrl, function( data ){
      ++count;

      if( typeof( data.items ) != 'undefined' ){
        data.items.forEach( function( calendarEvent ){
          allEvents.push( calendarEvent );
        } );
      }

      //final calendar data has arrived
      if(count >= calendarCount){
        callback( allEvents );
      }
    } );
  } );
};

self._oAuth2Callback = function ( dataObj, callback ) {

  if(!dataObj.error) {
    // start to built an abbreviated, flattened result object
    var result = {
      updated:      dataObj.data.updated,
      user: {
        name:       dataObj.email,
        email:      dataObj.email,
      },
      timeZone:     dataObj.data.timeZone,
      items:        []
    };

    var start = new Date();
    var startDateTime = start.toISOString();

    // the end date is 7 days from now
    var end = new Date();
    end.setDate(start.getDate()+7);
    var endDateTime = end.toISOString();
    // iterate through all fo the entries, to create flattened items
    try{
      if(dataObj.data) {
        dataObj.data.forEach(function(entry) {
          if( entry.status === 'confirmed'){
            var item = {
              title:      entry.summary || "",
              location:   entry.location || "",
              when:  [ {
                start: entry.start.dateTime || entry[i].start.date ,
                end: entry.end.dateTime || entry[i].end.date
              } ],
              updated:    entry.updated,
              link:       entry.htmlLink || ""

            };
            try{
              // Consider only those events that fall in the next 7 days.
              if ((new Date(item.when[0].start) >= start) && (new Date(item.when[0].end) <= end)){
                item.start_timestamp = new Date(entry.start.dateTime || entry[i].start.date).getTime();
                result.items.push(item);
              }
            }
            catch (err) {
              item.start_timestamp = new Date(entry.start.dateTime || entry[i].start.date).getTime();
              result.items.push(item);
            }
          }
        });
        result.totalResults = result.items.length;
      }
    }
    catch(e){
		logger.log("error", 'failed parsing calendar events: ' + e );
    }
    // call back 1st parameter falsey no error
    return callback(false, dataObj.response, result);
  }
  else {
    logger.log("error", "call failed: " + util.inspect(dataObj.error));
    // call back 1st parameter truthy if error
    return callback(dataObj.error, dataObj.response);
  }
};


self._oAuthCallback = function (error, data, response, feedUrl, callback) {

  if(!error) {
    //logger.log("info", "Calendar Feed for " + email + " took " + (new Date().getTime() - startTime) + "ms - URL: " + feedUrl);
    //Metrics.emit("update", {name: 'toolbar.google.calendar', val: (new Date().getTime() - startTime) });

    // parse the response into JSON
    try {
      var parsed = JSON.parse(data);
    }
    catch( err ){
	  logger.log("error", "googleCalendar.js error parsing data"[err, data] );
      return callback(err, response);
    }

    //logger.log("info", util.inspect(parsed, true, 10));

    // start to built an abbreviated, flattened result object
    var result = {
      updated:      parsed.data.updated,
      totalResults: parsed.data.totalResults,
      user: {
        name:       parsed.data.author.displayName,
        email:      parsed.data.author.email,
      },
      timeZone:     parsed.data.timeZone,
      items:        []
    };

    // iterate through all fo the entries, to create flattened items
    if(parsed.data.items) {
      parsed.data.items.forEach(function(entry) {
        var item = {
          title:      entry.title,
          location:   entry.location,
          when:       entry.when,
          updated:    entry.updated,
          link:       entry.alternateLink
        };
        result.items.push(item);
      });
    }

    // call back 1st parameter falsey no error
    return callback(false, response, result);
  }
  else {
	  logger.log("error", "encountered for call " + feedUrl + ". error --> " + util.inspect(error));
    // call back 1st parameter truthy if error
    return callback(error, response);
  }
};

// broken out for testing
var getFeedUrl = self.getFeedUrl = function(email) {
    // use handlebars to inject the email address into the URL specified in the config
    // eg "https://mail.google.com/mail/feed/atom/?xoauth_requestor_id={{email}}"

    // start date is NOW
    var start = new Date();
    var startDateTime = start.toISOString();

    // the end date is 7 days from now
    var end = new Date();
    end.setDate(start.getDate()+7);
    var endDateTime = end.toISOString();
    return hbs.compile(self.GOOGLE_CALENDAR_FEED_URL)({
      blockHelpers: {
        email: querystring.escape(email),
        start: startDateTime,
        end: endDateTime
      }
    });
};

self._getOauth2FeedUrl = function(template, data) {
    // use handlebars to inject the email address into the URL specified in the config
    // eg "https://mail.google.com/mail/feed/atom/?xoauth_requestor_id={{email}}"
    var compiledTemplates = {}
      , compiledTemplate = compiledTemplates[template] || (compiledTemplates[template] = hbs.handlebars.compile(template))
      , escapedData = {}
      , keys = Object.keys(data);

    keys.forEach(function(key) {
        escapedData[key] = data[key];
    });

    return compiledTemplate(escapedData);
};
