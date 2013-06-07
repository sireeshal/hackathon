dojo.provide("ecollege.toolbar.NotificationWidget");

// Dependencies
dojo.require("dojo.cache");
dojo.require("dojo.io.script");
dojo.require("dijit._Widget");
dojo.require("dijit._Contained");
dojo.require("mustache._Templated");
dojo.require("ecollege.toolbar.Utils");

/**
 @class
 @author    petef

 @description
 <p>Dropdown of notifications. For use in the toolbar.</p>
 */
dojo.declare("ecollege.toolbar.NotificationWidget", [dijit._Widget, dijit._Contained, mustache._Templated], {

  /************************************
   Properties
   ************************************/

  /**
   The template to use to display the widget's data
   @type  String
   */
  templateString: dojo.cache("ecollege.toolbar", "resources/NotificationWidget.html"),

  // these are the templates for each of the individual items
  itemTemplates: {
    'followMe': dojo.cache("ecollege.toolbar.resources", "NotificationItem-followme.html"),
    'comment': dojo.cache("ecollege.toolbar.resources", "NotificationItem-comment.html"),
    'dragnetThreadeddiscussionResponseCreated': dojo.cache("ecollege.toolbar.resources", "NotificationItem-threads-reply.html"),
    'dragnetThreadeddiscussionResponseContinued': dojo.cache("ecollege.toolbar.resources", "NotificationItem-threads-continue.html"),
    'dragnetDropboxSubmissionCreated': dojo.cache("ecollege.toolbar.resources", "NotificationItem-submission.html")
  },

  /**
   Add this base class to the widget
   @type  String
   */
  baseClass: "ecollege_google_notifications_widget",

  /**
   Trigger dojo to parse the html for other widgets
   @type  Boolean
   */
  widgetsInTemplate: true,

  /**
   The data retrieved from the data adapter
   @type  Object
   */
  data: null,

  /**
   Flag indicating a data retrieval error
   @type  Object
   */
  error: false,

  /**
   Flag indicating that data is currently being retrieved
   @type  boolean
   */
  loading: true,

  /**
   Array of notificaton ids that have already been rendered.
   @type  array
   */
  _renderedNotifications: [],

  /**
   Indicates the context for the toolbar (Is it embedded in the ph, course, etc.)
   @type  string
   */
  toolbarContext: null,

  /************************************
   Public Overrides
   ************************************/

  /**
   Constructor override
   @param  {Object}  p_options  Hash of options. Currently accepts a 'toolbarContext' property that can be set to "PH" or "Course".
   @public
   */
  constructor: function(p_options) {

    this.inherited(arguments);

    this.toolbarContext = p_options.toolbarContext || null;
    this.notif_data = p_options.data || [];
    this.notif_settings = p_options.settings || {};

    this.monitor = new this.NotificationMonitor(this.notif_settings);
  },

  /**
   @public
   */
  postCreate: function() {

    this.inherited(arguments);
    this.refresh();
  },

  /**
   Juggle some HTML nodes
   @public
   */
  startup: function() {

    this.inherited(arguments);

    var self = this;
    var button = dojo.query('.dijitButtonContents', this.domNode)[ 0 ];

    button.innerHTML = '<div class="notification-count no-count">0</div>';

    this.listNode = dojo.query('.notifications-menu')[ 0 ];
    this.countNode = dojo.query('.notification-count', button)[ 0 ];

    if (!this.notif_data.length) {
      // add default message
      dojo.place('<div id="notification-zero" class="notification-message">Loading...</div>', this.listNode);
    }
    else {
      // render the notifications in dropdown
      this._addNotifications(this.notif_data);
    }

    // this fires when the flyout is closed/hidden
    this.notificationDialog.onHide = function() {

      var utils = new ecollege.toolbar.Utils();
      self.countNode.innerHTML = '0';
      self.countNode.className = 'notification-count no-count';

      // loop through notifications - gather ids of the new items and change their status to read.
      dojo.query('.notification-item', self.listNode).forEach(function(item) {

        if (item.parentNode.className.indexOf('new-notification') != -1) {

          // change the class to read status
          var className = (utils.inSocial() && !utils.inDV() && ( item.type === 'followMe' || item.type === 'comment' )) ? 'ps-nav' : '';
          item.parentNode.className = 'old-notification ' + className;
        }

      });
    };

    this.notificationDialog.onShow = function() {

      var newIds = [];

      // make sure the list is scrolled to the top on show
      setTimeout(function() {
        self.listNode.parentNode.parentNode.scrollTop = 0;
      }, 1);

      // loop through notifications - gather ids of the new items and change their status to read.
      dojo.query('.notification-item', self.listNode).forEach(function(item) {

        if (item.parentNode.className.indexOf('new-notification') != -1) {

          // get id
          newIds.push(dojo.attr(item, 'data-id'));
        }

      });

      // mark the new ids read on the server
      if (newIds.length) {
        self.monitor.markRead(newIds);
      }
    };

    // load notifications on delay to save performance
    setTimeout(function() {

      // add the notification for any new data that comes in.
      self.monitor
        .init()
        .on('add', self._addNotifications, self);

    }, 2000);
  },

  // loop through an array of notifications and draw them in the dropdown
  _addNotifications: function(data, forceNow) {

    var prev = this._renderedNotifications;
    var pLen = prev.length;
    var render, k;

    // loop through notifications
    for (var i = data.length - 1; i >= 0; i--) {
      dojo.destroy('notification-zero');
      render = true;

      if (!data[ i ].id) {
        continue;
      }

      // if the notification id already exists, dont' render
      for (k = 0; k < pLen; k++) {

        if (prev[ k ] === data[ i ].id) {
          render = false;
          break;
        }
      }

      if (render) {
        this._renderNotification(data[ i ], forceNow);
      }
    }

    return this;
  },

  // actually draw the notification row using the correct template
  _renderNotification: function(item, forceNow) {

    var template = this.itemTemplates[ item.type ];
    var utils = new ecollege.toolbar.Utils();
    var self = this;

    if (template) {

      if (forceNow) {
        item.created = new Date().getTime();
      }

      try {

        if (!item.data || !item.data.content) {
          item.data.content = "";
        }

        var patterns = [
          /\n.*/g,
          /<[bB][rR]\/?>.*/g
        ];

        for (var i = 0; i < patterns.length; i++) {
          item.data.content = item.data.content.replace(patterns[i], '');
        }

        // strip all tags
        item.data.content = item.data.content.replace(/<\s*script[^>]*>.*?<\s*\/\s*script\s*>/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').replace(/<(?:.|\n)*?>/gm, '').trim();

        // build the HTML for the notification row
        var html = dojo.string.substitute(template, {
          id: item.id || '',
          type: item.type || '',
          author: item.author || '',
          title: this._formatTitle(item) || '',
          data: item.data || {},
          timestamp: item.created ? this._formatDate(item.created) : ''
        });

        if (!item.read) {
          var count = parseInt(this.countNode.innerHTML);

          if (++count > 999) {
            count = '999+';
          }

          this.countNode.innerHTML = count;
          this.countNode.className = 'notification-count';
        }

        var link = item.link;
        var cls = ( item.read ? 'old' : 'new' ) + '-notification notification-close';

        // if loaded in social, and social event, use relative path
        if (utils.inSocial() && !utils.inDV() && ( item.type === 'followMe' || item.type === 'comment' )) {
          link = link && new dojo._Url(link).path;
          cls += ' ps-nav';
        }

        var note = dojo.query(dojo.create('a', { innerHTML: html }, this.listNode, 'first')).addClass(cls);

        if (link) {
          note.attr('href', link);
        }

        dojo.connect(dojo.query('.notification-close')[0], 'onclick', function(evt) {

          if (!this.href) {
            evt.preventDefault();
          }

          dijit.popup.close(self.notificationDialog);
        });

        // add id to array for deduping later
        this._renderedNotifications.push(item.id);
      }
      catch (err) {
        console.error('notification failed to render ' + item.id + ' ' + item.type);
      }
    }

    return this;
  },

  // formats the "created" timestamp
  _formatDate: function(value) {

    var utils = new ecollege.toolbar.Utils();
    var noteMS = ( new Date(value) ).setHours(0, 0, 0, 0);
    var todayMS = ( new Date() ).setHours(0, 0, 0, 0);
    var yesterdayMS = ( new Date(todayMS - 86400000) ).setHours(0, 0, 0, 0);

    if (noteMS === todayMS) {
      return 'Today at ' + utils.formatDate(value, 'h:nnam/pm');
    }
    else if (noteMS === yesterdayMS) {
      return 'Yesterday at ' + utils.formatDate(value, 'h:nnam/pm');
    }
    else {
      return utils.formatDate(value, 'Mmmm dd at h:nnam/pm');
    }

  },

  // format the title
  _formatTitle: function(item) {

    if (!item.data) {
      return '';
    }

    switch (item.type) {

      case 'dropboxSubmissionCreated':
        return item.data[ 'filename' ];

      case 'dragnetThreadeddiscussionResponseCreated':
        return 'Re: ' + item.data[ 'threadTitle' ];

      case 'dragnetThreadeddiscussionResponseContinued':
        return item.data[ 'threadTitle' ];

      default:
        return item.data[ 'title' ];
    }
  },

  /************************************
   Public Methods
   ************************************/

  /**
   Refreshes the content of the widget
   @public
   */
  refresh: function() {
    //console.log("WhosOnlineWidget.refresh()");

    //NOTE: This section of code copied from _Widget.create.  No way to call the code
    //there without destroying the whole widget and recreating it.
    this.srcNodeRef = this.domNode;
    this.buildRendering();

    if (this.domNode) {
      // Copy attributes listed in attributeMap into the [newly created] DOM for the widget.
      // Also calls custom setters for all attributes with custom setters.
      this._applyAttributes();

      // If srcNodeRef was specified, then swap out original srcNode for this widget's DOM tree.
      // For 2.0, move this after postCreate().  postCreate() shouldn't depend on the
      // widget being attached to the DOM since it isn't when a widget is created programmatically like
      // new MyWidget({}).   See #11635.
      var source = this.srcNodeRef;
      if (source && source.parentNode && this.domNode !== source) {
        source.parentNode.replaceChild(this.domNode, source);
      }
    }

    if (this.domNode) {
      // Note: for 2.0 may want to rename widgetId to dojo._scopeName + "_widgetId",
      // assuming that dojo._scopeName even exists in 2.0
      this.domNode.setAttribute("widgetId", this.id);
    }

    this.startup();
  },

  /************************************
   Classes
   ************************************/

  NotificationMonitor: function(settings) {

    this._settings = settings;
    var utils = new ecollege.toolbar.Utils();

    // init
    this.init = function() {

      this.initialLoad();

      this._settings.method === 'subway' ? this._initSubway() : this._initPolling();

      return this;
    }

    // init subway listener
    this._initSubway = function() {

    }

    // init polling listener
    this._initPolling = function() {

      var self = this;
      var msInterval = ( this._settings.interval || 10 ) * 1000;

      setInterval(function() {
        self.checkUpdates();
      }, msInterval);
    }

    this.sortNotifications = function(data) {

      if (Array.isArray(data)) {

        data.sort(function(a, b) {

          // if both read or both unread, sort by date
          if (a.read == b.read) {
            if (new Date(a.created) < new Date(b.created)) {
              return 1;
            }
            else {
              return -1;
            }
          }
          else {
            return ( a.read ) ? 1 : -1;
          }
        });
      }

      return data;
    }

    // used to grab notifications on page load
    this.initialLoad = function() {

      var self = this;

      var xhrArgs = {
        preventCache: true,
        handleAs: "json",
        callbackParamName: 'callback',
        load: function(resp) {

          if (resp.status === 'success') {

            var data = self.sortNotifications(resp.data && resp.data.notifications);

            if (data.length == 0) {
              var listNode = dojo.query('.notifications-menu')[ 0 ];
              listNode.innerHTML = "";
              dojo.place('<div id="notification-zero" class="notification-message">You currently have no notifications.</div>', listNode);
            }

            if (data) {
              self.trigger('add', data);
            }
          }
        }
      };

      try {
        if (utils.hasCors()) {
          xhrArgs.url = this._settings.rootUrl + this._settings.allUrl;
          dojo.xhrGet(xhrArgs);
        }
        else {
          xhrArgs.url = this._settings.rootUrl + '/_jsonp/get' + this._settings.allUrl;
          dojo.io.script.get(xhrArgs);
        }
      }
      catch (e) {

      }
    }

    // used to poll for any new notifications
    this.checkUpdates = function() {

      var self = this;

      var xhrArgs = {
        url: this._settings.url,
        preventCache: true,
        handleAs: "json",
        callbackParamName: 'callback',
        load: function(resp) {

          if (resp.status === 'success') {

            var data = resp.data && resp.data.notifications;

            if (data) {
              self.trigger('add', data, true);
            }
          }
        }
      };

      try {
        if (utils.hasCors()) {
          xhrArgs.url = this._settings.rootUrl + this._settings.url;
          dojo.xhrGet(xhrArgs);
        }
        else {
          xhrArgs.url = this._settings.rootUrl + '/_jsonp/get' + this._settings.url;
          dojo.io.script.get(xhrArgs);
        }
      }
      catch (e) {

      }
    }

    // takes an array of ids to mark as "read" on the server
    this.markRead = function(ids) {

      var xhrArgs = {
        preventCache: true,
        putData: JSON.stringify(ids),
        handleAs: "json",
        callbackParamName: 'callback',
        load: function(resp) {
          // what do we want to happen?
        }
      }

      try {
        if (utils.hasCors()) {
          xhrArgs.url = this._settings.rootUrl + this._settings.readUrl;
          dojo.xhrPut(xhrArgs);
        }
        else {
          xhrArgs.url = this._settings.rootUrl + '/_jsonp/put' + this._settings.readUrl + '&_body=' + encodeURIComponent(JSON.stringify(ids));
          dojo.io.script.get(xhrArgs);
        }
      }
      catch (e) {

      }
    }

    // fire events attached to the notification monitor
    this.trigger = function(name) {

      var slice = Array.prototype.slice;
      var events = this._events && this._events[ name ];

      if (events) {
        var ev;

        for (var i = 0, len = events.length; i < len; i++) {
          ev = events[ i ];
          ev.callback.apply(ev.context, slice.call(arguments, 1));
        }
      }

      return this;

    }

    // bind events to the monitor, like 'add', 'delete', etc
    this.on = function(name, callback, context) {

      var events = this._events || ( this._events = {} );
      var eventCallbacks = events[ name ] || ( events[ name ] = [] );

      eventCallbacks.push({
        callback: callback,
        context: context || this
      });

      return this;
    }
  }
});
