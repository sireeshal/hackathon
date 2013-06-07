// Provide the class
dojo.provide("ecollege.toolbar.WhosOnlineWidget");

// Dependencies
dojo.require("dojo.cache");
dojo.require("dijit._Widget");
dojo.require("dijit._Contained");
dojo.require("mustache._Templated");

/**
	@class
	@author		gregt
	
	@description
	<p>Dropdown of who's online. For use in the toolbar.</p>
*/
dojo.declare("ecollege.toolbar.WhosOnlineWidget", [dijit._Widget, dijit._Contained, mustache._Templated], {

	/************************************
		Properties
	************************************/

	/**
		The template to use to display the widget's data
		@type	String
	*/
	templateString : dojo.cache("ecollege.toolbar","resources/WhosOnlineWidget.html"),
	
	/**
		Add this base class to the widget
		@type	String
	*/
	baseClass: "ecollege_google_whos_online_widget",
	
	/**
		Trigger dojo to parse the html for other widgets
		@type	Boolean
	*/
	widgetsInTemplate: true,
	
	/**
		The data retrieved from the data adapter
		@type	Object
	*/
	data: null,
	
	/**
		Flag indicating a data retrieval error
		@type	Object
	*/
	error: false,
	
	/**
		Flag indicating that data is currently being retrieved
		@type	boolean
	*/
	loading: true,
	
	/**
		Indicates the context for the toolbar (Is it embedded in the ph, course, etc.)
		@type	string
	*/
	toolbarContext: null,
	
	/************************************
		Public Overrides
	************************************/
	
	/**
		Constructor override
		@param	{Object}	p_options	Hash of options. Currently accepts a 'toolbarContext' property that can be set to "PH" or "Course".
		@public
	*/
	constructor: function(p_options) {
		this.inherited(arguments);
		//console.log("this = " + this);
		//console.log("p_options = " + p_options);
		//if (p_options) console.log("p_options.toolbarContext = " + p_options.toolbarContext);
		
		this.toolbarContext = p_options.toolbarContext || null;
		this.is_social = p_options.is_social || false;
		this.profile_url = p_options.profile_url || null;
	},
	
	/**
		Subscribe to events from UsersDataProvider
		@public
	*/
	postCreate: function() {
		//console.log("WhosOnlineWidget.postCreate()");
		this.inherited(arguments);
		var self = this;
		
		dojo.subscribe("/ecollege/toolbar/WhosOnlineWidget/updatePeopleData", function(evtData) {
			
			//console.log("WhosOnlineWidget: Got Poll Data:", evtData);
			
			self._storeData(evtData);
			self.error = false;
			self.loading = false;
			self.refresh();
		});
		
		dojo.subscribe("/ecollege/toolbar/WhosOnlineWidget/peopleDataError", function(errData) {
			
			console.error("WhosOnlineWidget: Error: ", errData);
			
			// only print the error to screen if this is the first we've heard back from the data provider,
			// otherwise we might already have valid data on the screen so no need to replace it with an error.
			if (self.loading) {
				self.error = true;
				self.loading = false;
				self.refresh();
			}
		});
	},
	
	/**
		Juggle some HTML nodes
		@public
	*/
	startup: function() {

        var self = this;
		var style = ' style="display:none"';
		var count = 0;
		
		if ( this.data && this.data.length ) {
			style = '';
			count = this.data.length;
		}
		
		this.inherited( arguments );
		
		this.countNode = dojo.query( '.dijitButtonContents', this.domNode )[ 0 ];
		this.countNode.innerHTML = '<div class="badge_count"' + style + '>' + count + '</div>';

        this.button.onClick = function() {
            self.stats.sendCounter('whosonline', 1);
        };
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

	        if(this.domNode){
	            // Copy attributes listed in attributeMap into the [newly created] DOM for the widget.
	            // Also calls custom setters for all attributes with custom setters.
	            this._applyAttributes();
	
	            // If srcNodeRef was specified, then swap out original srcNode for this widget's DOM tree.
	            // For 2.0, move this after postCreate().  postCreate() shouldn't depend on the
	            // widget being attached to the DOM since it isn't when a widget is created programmatically like
	            // new MyWidget({}).   See #11635.
	            var source = this.srcNodeRef;
	            if(source && source.parentNode && this.domNode !== source){
	                source.parentNode.replaceChild(this.domNode, source);
	            }
	        }
	
	        if(this.domNode){
	            // Note: for 2.0 may want to rename widgetId to dojo._scopeName + "_widgetId",
	            // assuming that dojo._scopeName even exists in 2.0
	            this.domNode.setAttribute("widgetId", this.id);
	        }
	        
	        this.startup();
	        
	},
	
	/************************************
		Private Methods
	************************************/
	
	/**
		Filter out offline users and self from the data array, sort the users, and store it.
		@private
	*/
	_storeData: function(p_data) {
		//console.log("WhosOnlineWidget._storeData()");
		
		// filter out offline users and self
		var users = dojo.filter(p_data, function(iUser) {
			if (iUser.isMe || !iUser.isOnline) {
				return false;
			} else {return true;}
		});
		
		//users = p_data; // filter bypass - debug only
		
		// isolate and sort instructors
		var profs = dojo.filter(users, function(iUser) {
			return iUser.isProf;
		});
		profs.sort(function(a,b) {
			var nameA = a.longDisplayName.toLowerCase();
			var nameB = b.longDisplayName.toLowerCase();
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}
			return 0; //default return value (no sorting)
		});
		
		// isolate and sort students
		var students = dojo.filter(users, function(iUser) {
			return !iUser.isProf;
		});
		students.sort(function(a,b) {
			var nameA = a.sortingName.toLowerCase();
			var nameB = b.sortingName.toLowerCase();
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}
			return 0; //default return value (no sorting)
		});
		
		// recombine instructors and students
		users = profs.concat(students);
		
		// store it
		this.data = users;
	},
	
	/**
		Handler for when a user name or avatar hyperlinked is clicked in the view.
		@private
	*/
	_onShowPersonProfile: function(p_event) {
		//console.log("_onShowPersonProfile() and toolbarContext = " + this.toolbarContext);
		
		if (this.toolbarContext && this.toolbarContext.toLowerCase() == "ph" && !this.is_social) {
			
			dojo.publish("/ecollege/ph/showMain");
			dojo.publish("/ecollege/ph/showPeopleTab");
			dojo.publish("/ecollege/ph/showPeopleProfile",[{
				userId: dojo.attr(p_event.currentTarget, "data-userId"),
				personaId: dojo.attr(p_event.currentTarget, "data-personaId")
			}]);
			
		}
		else if (this.toolbarContext && this.toolbarContext.toLowerCase() == "dv") {
			// enable once deep linking to course profile is available
		}
		else if ( this.is_social ) {
			
			var token = encodeURIComponent(ecollege.toolbar.Toolbar.data.tokens.whit_access_token);
			var refresh_token = encodeURIComponent(ecollege.toolbar.Toolbar.data.tokens.whit_refresh_token);
			var affinityId = dojo.attr( p_event.currentTarget, 'data-personaId' );
			var profileUrl = dojo.string.substitute( this.profile_url, { affinityId: affinityId, token: token, refresh_token: refresh_token } );
			
			window.location = profileUrl;
		}
	},
	
	/**
		Handler for when a user's chat icon is clicked in the view.
		@private
	*/
	_onBeginChat: function(p_event) {
        this.stats.sendCounter('chat', 1);
		dojo.publish("/ecollege/social/chat/initiateChat",[dojo.attr(p_event.currentTarget, "data-personaId")]);
	}
});
