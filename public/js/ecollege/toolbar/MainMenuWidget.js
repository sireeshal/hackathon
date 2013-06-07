dojo.provide("ecollege.toolbar.MainMenuWidget");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.DropDownButton");
dojo.require("dojo.io.script");
dojo.require("dojo.cache");

dojo.require("ecollege.toolbar.Utils");
dojo.declare("ecollege.toolbar.MainMenuWidget", [dijit._Widget, dijit._Templated], {
	templateString: dojo.cache("ecollege.toolbar", "resources/MainMenuWidget.html"),
	widgetsInTemplate: true,
	
	baseClass: "ecollege_main_menu_widget",
	
	constructor: function( options ) {
		
		this.inherited( arguments );
	},

	postCreate: function() {
		this.inherited( arguments );
	},
	
	startup: function() {

		var data = ecollege.toolbar.Toolbar.data;
        var utils = new ecollege.toolbar.Utils();
		
		var dashUrl =  utils.filterUrl(data.config.dashboard_url);
	
		this.inherited( arguments );
		
		var listNode = this.listNode = dojo.query(".ecollege_google_widget_main_menu .toolbar_main_menu_dropdown")[0];
		
		// make the institution name the title
		dojo.query( "span.dijitButtonText", this.domNode )[ 0 ].innerHTML = data.institution.name;
								
		// main nav
		this._addLink( dashUrl, '<i class="mainmenu-icon-home"></i> Dashboard', data.tokens );
		this._addCourseLinks( data );
		
		// only add the share link if the share_url is included in the config
	    if ( data.config.share_url ) {
			this._addLink( data.config.share_url, '<i class="mainmenu-icon-share"></i> Share', data.tokens );
		}

		// force hide of dropdown when something is clicked
		dojo.connect( listNode, 'onclick', function() {
			dojo.style( utils.closestClass( 'dijitPopup', listNode ), { display: 'none' });
		});
	},	

	_addLink: function( linkTmpl, text, tokens ) {	
		
		var linkUrl = dojo.string.substitute( linkTmpl, {
			token: encodeURIComponent( tokens.whit_access_token ),
			refresh_token: encodeURIComponent( tokens.whit_refresh_token )
		});
		
		dojo.place( '<li><a class="ps-nav" href="' + linkUrl + '">' + text + '</a></li>', this.listNode );
	},

	_addCourseLinks: function( data ) {
		var token = data.tokens.whit_access_token;
		var linkTemplate = '<li><a class="ecollege-toolbar-course-link" href="${url}" data-toolbar-course-id="${courseId}"><span class="main_menu_course-title">${courseTitle}</span> - ${courseCode}</a></li>';
		var url, course, courseList;
		var len = data.courses.length;

        dojo.place( '<h6><i class="mainmenu-icon-courses"></i> Current Courses</h6>', this.listNode );
        courseList = dojo.create( 'ul', { className: 'toolbar_main_menu_courses' }, this.listNode );

		if ( len ) {
			
			for ( var i = 0; i < len; i++ ) {

				course = data.courses[ i ];

				if ( course && course.campusId ) {

					url = data.config.ph_root + "/transfer.html?action=launchCourse&courseId=" + course.campusId + "&token=" + encodeURIComponent( token );

					dojo.place( dojo.string.substitute( linkTemplate, {
						courseCode: course.displayCourseCode, 
						courseTitle: course.title, 
						url: url,
						courseId: course.campusId
					}), courseList );
				}			
			}

			this._wireupCourseLinks( data );
		}
        else {

            if (data.call_status.courses != 'error')
                dojo.place('<li class="ecollege-toolbar-course-link"><span class="ecollege-toolbar-course-info">You are currently not enrolled in any courses.</span></li>', courseList );
            else
                dojo.place('<li class="ecollege-toolbar-course-link"><span class="ecollege-toolbar-course-info">Could not load your courses.</span></li>', courseList );

        }
	},

	_wireupCourseLinks: function( data ) {
        if(this.consumer == "ph") {
            dojo.query(".ecollege-toolbar-course-link").connect('onclick', function(evt) {
                dojo.stopEvent(evt);
                var courseId = evt.target.getAttribute("data-toolbar-course-id");
                dojo.publish("/ecollege/ph/launchCourse", [courseId]);
            });
        }
	}
});
