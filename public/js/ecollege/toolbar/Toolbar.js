dojo.provide("ecollege.toolbar.Toolbar");

dojo.require("ecollege.toolbar.HeaderWidget");
dojo.require( 'ecollege.toolbar.Api' );


(function() {
    if(!ecollege.toolbar.Toolbar.init) {

        var self = ecollege.toolbar.Toolbar;

        // placeholder for the config passed to initialize the Toolbar
        // if this already exists that means the parent is using config override
        if (!dojo.exists("config", self)) self.config = {};

        // placeholder for the data returned by /toolbar
        // accessible by ecollege.toolbar.Toolbar.data
        self.data = {};

        // reference to the ToolbarWidget
        self._headerWidget = null;

        // ready wraps a deferred and registers a callback that get's fired when
        // the inital toolbar data has been returned.
        // Toolbar.ready(function(readyState) { });
        //
        // NOTE: without proper time to think through the public API for the toolbar
        // only very minimal data is being returned. The intent is that at least
        // these properties will always be available in a support way
        //
        // readyState will contain these properties
        // tokens: {
        //     whit_access_token,
        //     affinity_access_token
        // },
        // is_google: true|false
        self._readyDeferred = new dojo.Deferred();
        self.ready = function ready(callback) {
            self._readyDeferred.then(callback);
        };

        /*
         * Initialized the Toolbar, creates the HeaderWidget
         * @param config object
         *      server - the protocol, host, port of the toolbar service
         *      moauth_access_token
         *      moauth_refresh_token
         *      whit_access_token
         *      whit_refresh_token
         *      consumer - identification of embedding application ie 'ph'
         *      slug - institution slug
         *      ajax_manager - reference to an ajax manager
         *
         */
        self.init = function init(config) {
			TIMERSTAT.record( 'dependencies loaded' );

            dojo.mixin(self.config, config);
            window.console && window.console.log && window.console.log("toolbar config is: ", self.config);

            // create the element to hang the HeaderWidget and add it to the end of the body tag
            dojo.place('<div id="HeaderWidget"></div>', dojo.body());

            // inject the stylesheet into the head element
            dojo.create("link", {
                type: "text/css",
                rel:"stylesheet",
                href: dojo.moduleUrl("ecollege.toolbar").uri + "resources/Toolbar.css"
            }, dojo.query("head")[0]);

            // inject the chat stylesheet if we are managing chat session
            if (self.config.manage_chat != false) {
	            dojo.create("link", {
	                type: "text/css",
	                rel:"stylesheet",
	                href: dojo.moduleUrl("ecollege.social.chat").uri + "styles/Chat.css"
	            }, dojo.query("head")[0]);
            }

            // create the HeaderWidget, passing the config object
            self._headerWidget = new ecollege.toolbar.HeaderWidget(self.config, 'HeaderWidget');
            self._headerWidget.startup();
        }
        /*
         * Public API
         */

        self.api = {};
        /*
         * startGoogleWebFlow( force )
         *
         * @param    force (boolean) if true user is prompted for
         *           authorization and a new refresh token is created
         *           if false no prompt if user has authorized access
         *           and no refresh token is created
         */
        self.api.startGoogleWebFlow = function( force ) {
            self._api = new ecollege.toolbar.Api( { force: force } );
            self._api.startGoogleWebFlow(  );
        }

        /*
         * removeUser()
         *
         * Removes a user from the Chamber
         */
        self.api.removeGoogleUser = function() {
            self._api = new ecollege.toolbar.Api( );
            self._api.removeGoogleUser();
        }

        /*
         * getUser()
         *
         * Returns user information
         */
        self.api.getUser = function() {
            self._api = new ecollege.toolbar.Api( );
            return self._api.getUser();
        }

        self.api.reloadCollaborations = function() {
          dojo.empty(dojo.byId('divContentLoader'));
          dojo.place( "<div id='CollabSpace'></div>", 'divContentLoader');
          new collaborations.CollabSpace({ is_google: true, is_reload: true }, 'CollabSpace').startup();
        }
        
        self.api.getServices = function() {
          var services = [ 'google', 'skype' ];
          return services;
        }
    }

}());
