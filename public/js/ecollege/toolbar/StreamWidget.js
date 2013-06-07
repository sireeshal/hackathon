dojo.provide("ecollege.toolbar.StreamWidget");

// Dependencies
dojo.require("dojo.cache");
dojo.require("dojo.io.script");
dojo.require("dijit._Widget");
dojo.require("dijit._Contained");
dojo.require("mustache._Templated");
dojo.require("ecollege.toolbar.Utils");

/**
	@class
	@author		petef	
	@description

	<p>Dropdown of streams. For use in the toolbar.</p>
*/
dojo.declare("ecollege.toolbar.StreamWidget", [dijit._Widget, dijit._Contained, mustache._Templated], {

	/************************************
		Properties
	************************************/

	/**
		The template to use to display the widget's data
		@type	String
	*/
	templateString : dojo.cache("ecollege.toolbar","resources/StreamWidget.html"),
	
	/**
		Add this base class to the widget
		@type	String
	*/
	baseClass: "ecollege_google_stream_widget",
	
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
	
	/**
		Indicates if the stream has been loaded
		@type	boolean
	*/
	streamLoaded: false,
	
	/************************************
		Public Overrides
	************************************/
	
	/**
		Constructor override
		@param	{Object}	p_options	Hash of options. Currently accepts a 'toolbarContext' property that can be set to "PH" or "Course".
		@public
	*/
	constructor: function( options ) {
		
		this.inherited( arguments );
		
		this.affinityId = options.affinityId;
	},
	
	/**
		@public
	*/
	postCreate: function() {
		
		this.inherited( arguments );
		
		this.refresh();
	},
	
	/**
		Juggle some HTML nodes
		@public
	*/
	startup: function() {
		
		var self = this;
		
		dojo.query( '.dijitButtonContents', this.domNode )[ 0 ].innerHTML = '';	
		
		this.inherited( arguments );		
		this.listNode = dojo.query( '.stream-menu' )[ 0 ];
		
		// this fires when the flyout is closed/hidden
		this.streamDialog.onHide = function() {};
		
        this.streamDialog.onShow = function() {
			
			if ( !self.streamLoaded ) {			
			
				var tag = dojo.create( 'script', {
					'src': 'http://manhattanui-release.prsn.us:8080/js/libs/require/require-jquery.js',
					'data-main': 'http://manhattanui-release.prsn.us:8080/js/widgets/socialCourseHome/main',
					'data-affinity-id': self.affinityId,
					'data-widget': 'socialCourseHome',
					'data-group-id': 'course_7373496'  
					}, null, 'only' );

				self.listNode.appendChild( tag );
				
				self.streamLoaded = true;
			}
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
	}
});
