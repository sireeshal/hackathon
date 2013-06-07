dojo.provide("ecollege.toolbar.ProfileWidget");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.DropDownButton");
dojo.require("dojo.io.script");
dojo.require("dojo.cache");

dojo.require("ecollege.toolbar.Utils");

dojo.declare("ecollege.toolbar.ProfileWidget", [dijit._Widget, dijit._Templated], {
	templateString: dojo.cache("ecollege.toolbar", "resources/ProfileWidget.html"),
	widgetsInTemplate: true,
	
	baseClass: "ecollege_profile_widget",
	
	constructor: function( options ) {
		
		this.inherited( arguments );

		this._isSuperAdmin = options.isSuperAdmin;
	},

	postCreate: function() {
	    this.inherited(arguments);
	},

	startup: function() {
	
	    this.inherited(arguments);

		var utils = new ecollege.toolbar.Utils();
		var data =  ecollege.toolbar.Toolbar.data;
		var config = ecollege.toolbar.Toolbar.config;
		var targetNode =dojo.query("span.dijitButtonText", this.domNode)[0];
		var avatarUrl = ((data.profile.avatar[0] == "/") ? config.server : "") + data.profile.avatar;
		var token = encodeURIComponent( ecollege.toolbar.Toolbar.data.tokens.whit_access_token );
		var refresh_token = encodeURIComponent( ecollege.toolbar.Toolbar.data.tokens.whit_refresh_token );
		var affinity_token = ecollege.toolbar.Toolbar.data.tokens.affinity_access_token;
		var affinity_id = utils.affinityIdFromToken( affinity_token );

		targetNode.innerHTML = '<div class="toolbar-profile-image"><img src="' + avatarUrl + '" alt="' + data.profile.name + '"/></div><div class="toolbar-profile-name">' + data.profile.name + '</div>';

		var listNode = dojo.query(".ecollege_google_widget_profile .toolbar_profile_dropdown")[0];

		var profileUrl, profileText, profileId;		
		var helpUrl = data.config.help_url;
		
		if (data.institution.is_social) {
			profileText = 'View Profile';
			profileId = 'social_toolbar_account_link';
            try {
			    profileUrl = dojo.string.substitute( utils.filterUrl(data.config.profile_url), { affinityId: affinity_id, token: token, refresh_token: refresh_token  } );
            }
            catch(e){
                utils.log('View profile template error: ' + e);
            }
		}
		else {
			profileText = 'Edit Profile';
			profileId = 'ecollege_toolbar_account_link';
            try {
			    profileUrl = dojo.string.substitute( data.config.profile_url, { token: token } );
            }
            catch(e){
                utils.log('Edit profile template error: ' + e);
            }
		}
		
		if ( this._isSuperAdmin ) {
			dojo.place( '<li><a href="' + data.config.admin_root + "/admin.html?token=" + token + '">Über Admin</a></li>', listNode );
		}
		
		dojo.place('<li id="ecollege_toolbar_account_wrap"><a class="ps-nav" id="' + profileId + '" href="' +  profileUrl + '">' + profileText + '</a></li>', listNode);

		if ( data.config.settings_url ) {
            try {
                var settingsUrl = dojo.string.substitute( utils.filterUrl(data.config.settings_url), { affinityId: affinity_id, token: token, refresh_token: refresh_token  });
                dojo.place('<li><a class="ps-nav" href="' +  settingsUrl + '">Settings</a></li>', listNode);
            }
            catch(e){
                utils.log('Settings template error: ' + e);
            }
		}

		if ( data.institution.is_admin ) {
		    try {
                var linkUrl = dojo.string.substitute( data.config.admin_url, {
                    token: token,
                    refresh_token: refresh_token
                });
            }
            catch(e){
                utils.log('Admin template error: ' + e);
            }

			dojo.place( '<li><a href="' + linkUrl + '">Admin</a></li>', listNode );
		}
		
		var html = [ '<li class="help-row"><a href="', helpUrl, '" target="_blank">Help</a>' ];
		
		if ( data.config.get_satisfaction_fastpass_url ) {
			html.push( '<span class="list-divider">|</span><a href="javascript:FASTPASS.popout_gsfn();">Community Forum</a>' );
		
			// Get Satisfaction SSO (GS code...mostly)
			
			var head = dojo.query( 'head' )[0];
			
			dojo.create('script', {
				src: data.config.root + '/js/fastpass.js',
				type: 'text/javascript'
			}, head );
			
			dojo.create('script', {
				src: data.config.get_satisfaction_fastpass_url,
				type: 'text/javascript'
			}, head );
			
			// End Get Satisfaction
		}
		else if ( data.config.get_satisfaction_url ) {
			html.push( '<span class="list-divider">|</span><a href="', data.config.get_satisfaction_url, '" target="_blank">Community Forum</a>' );
		}
		
		html.push( '</li>' );
		
		// place the help and community forum links
		dojo.place( html.join( '' ), listNode );

		if (ecollege.toolbar.Toolbar.config.consumer === "ph" && !data.institution.is_social) {
			dojo.connect(dojo.byId("ecollege_toolbar_account_link"), 'onclick', function(evt) {
				dojo.publish("/ecollege/ph/showMyProfile");
				dojo.stopEvent(evt);
			});
		}

		// force hide of dropdown when something is clicked
		dojo.connect( listNode, 'onclick', function() {
			dojo.style( utils.closestClass( 'dijitPopup', listNode ), { display: 'none' });
		});
    }
});
