dojo.provide( 'ecollege.toolbar.Api' );

dojo.require("dijit._Widget");
dojo.require("ecollege.toolbar.Toolbar");
dojo.require("ecollege.toolbar.Utils");

dojo.declare('ecollege.toolbar.Api',  [dijit._Widget], {
    constructor: function( props ) {
        if (props) dojo.safeMixin( this, props );
        this.config = ecollege.toolbar.Toolbar.config;
        var moduleUrl = dojo.moduleUrl( 'ecollege.toolbar.Api' );
        this.googleOauth2Url = 'https://accounts.google.com/o/oauth2/auth';
        this.googleConsumerMessageUrl = ( moduleUrl.scheme ? moduleUrl.scheme + '://' + moduleUrl.authority : '' ) + '/message.html';
        this.googleConsumerObjectUrl = ( moduleUrl.scheme ? moduleUrl.scheme + '://' + moduleUrl.authority : '' ) + '/google-consumer-object?token={0}';
        this.googleCodeUrl = ( moduleUrl.scheme ? moduleUrl.scheme + '://' + moduleUrl.authority : '' ) + '/google-code?token={0}&key={1}';
        this.googleGetConsumerTokenUrl = ( moduleUrl.scheme ? moduleUrl.scheme + '://' + moduleUrl.authority : '' ) + '/google-get-consumer-token?token={0}';
        this.googleSaveConsumerTokenUrl = ( moduleUrl.scheme ? moduleUrl.scheme + '://' + moduleUrl.authority : '' ) + '/google-save-consumer-token?token={0}';
        this.googleRemoveConsumerTokenUrl = ( moduleUrl.scheme ? moduleUrl.scheme + '://' + moduleUrl.authority : '' ) + '/google-remove-user?token={0}';
        this.googleTokenEmailUrl = 'https://www.googleapis.com/oauth2/v1/userinfo?access_token={0}';
        this.googleTokenInfoUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={0}';
        this.token = encodeURIComponent( ecollege.toolbar.Toolbar.data.tokens.whit_access_token );
    },

//PUBLIC METHODS
    /*
     * Starts the Oauth2 web flow
     *
     */
    startGoogleWebFlow: function() {
        this._getGoogleConsumerObject();
    },

    getUser: function() {
      var data = ecollege.toolbar.Toolbar.data;
      var googleType = (data.institution.google_domain) ? 'domain' : 'user';
      var isGoogle = data.institution.is_google;
      var googleEmail = data.institution.googleEmail;

      var user = {
          name: data.profile.name,
          avatar: data.profile.avatar,
          email: data.profile.email,
          is_google: isGoogle,
          google_type: (isGoogle) ? googleType : null,
          googleEmail: (isGoogle) ? googleEmail : null
      }
      return user;
      this.destroy();
    },
    /*
     * Remove a consumer user from the Chamber service
     *
     */
    removeGoogleUser: function() {
      this._removeUser();
    },

//PRIVATE METHODS
    _googleWebFlow: function() {
        var self = this;
        var data = ecollege.toolbar.Toolbar.data;
        var key = Math.floor(Math.random()*100000000001) + data.profile.email;
        var newRefreshToken = self.force ? 'force' : 'auto';

        self.config.googleConsumerObject.approval_prompt = newRefreshToken;
        self.config.googleConsumerObject.state = dojo.toJson({ key: key, token: self.token });

        var obj = {
            w: window.innerWidth,
            h: window.innerHeight,
            popW: 800,
            popH: 610,
            uri: self.googleOauth2Url,
            queryStr: dojo.objectToQuery( self.config.googleConsumerObject )
        }
        obj.leftPos = ( obj.w - obj.popW ) / 2;
        obj.topPos = ( obj.h - obj.popH ) / 2;

        // Google wants the scope delimiters unencoded ( plus character )
        uri = obj.uri + "?" + obj.queryStr.replace( /%2b/gi, '+');

        var popUp = window.open(
            uri,
            'thiswindow',
            'width=' + obj.popW + ', \
            height=' + obj.popH + ', \
            left=' + obj.leftPos + ', \
            top=' + obj.topPos + ', \
            directories=no, \
            location=no, \
            menubar=no, \
            resizable=no, \
            scrollbars=1, \
            status=no, \
            toolbar=no'
        );

        function _sendPopUpBlockedMessage() {
            dojo.publish( 'google-authorization', [{
                status: "popup-blocked",
                data: ""
            }]);
            self.destroy();
        }

        if (popUp == null || typeof(popUp)=='undefined' || typeof(popUp.location.href) == 'undefined') {
            //alert('Please disable your pop-up blocker.');
            return _sendPopUpBlockedMessage();
        }
        else {
            popUp.focus();
        }

		var popUpTimer = function () {
			setTimeout(function () {
				if (popUp.closed) {
					if (key) {
						self._getGoogleCode(key);
					}
					else {
						dojo.publish("google-authorization", [
							{
								status: "error",
								data: "user-abort"
							}
						]);
						self.destroy();
					}
					return true;
				}
				popUpTimer();
			}, 500);
		}
        popUpTimer();
    },

    _getGoogleCode: function( key ) {
        var self = this;

        var jsonpArgs = {
            url: dojo.replace( this.googleCodeUrl, [ self.token, key ] ),
            callbackParamName: "callback",
            handleAs: 'json',
            preventCache: true,
            load: function(data) {
                if( data.status !== "success" ) {
                    console.log( "unable to fetch google-code" );
                    dojo.publish("google-authorization-code", [{
                        status: "error",
                        data: 'unknown error'
                    }]);
                    self.destroy();
                }
                else {
                    if( data.code === '404' ){
                        dojo.publish("google-authorization-code", [{
                            status: "abort",
                            data: 'user-abort'
                        }]);
                        dojo.publish("google-authorization", [{
                            status: "abort",
                            data: 'user-abort'
                        }]);
                        self.destroy();
                    }
                    else{
                        dojo.publish("google-authorization-code", [{
                            status: "success",
                            data: data.data
                        }]);
                        self._getGoogleConsumerToken( data.data );
                    }
                }
            },
            error: function(error) {
                console.log( error );
                dojo.publish("google-authorization-code", [{
                    status: "error",
                    data: 'unknown error'
                }]);
                self.destroy();
            }
        }
        dojo.io.script.get( jsonpArgs );
    },

    _getGoogleConsumerObject: function() {
        var self = this;

        var jsonpArgs = {
            url: dojo.replace( this.googleConsumerObjectUrl, [ self.token ] ),
            callbackParamName: "callback",
            preventCache: true,
            load: function(data) {
                if( data.status !== "success" ) {
                    console.log( "unable to fetch googleConsumerObject" );
                    dojo.publish("google-authorization-code", [{
                        status: data.status,
                        data: data.error
                    }]);
                    self.destroy();
                }
                else {
                    dojo.setObject( 'ecollege.toolbar.Toolbar.config.googleConsumerObject', data.data.googleConsumerObject);
                    self._googleWebFlow();
                }
            },
            error: function(error) {
                dojo.publish("google-authorization-code", [{
                    status: "error",
                    data: error
                }]);
                self.destroy();
            }
        };
        dojo.io.script.get( jsonpArgs );
    },

    _getGoogleConsumerToken: function( code ){
        var self = this;

        if( code === null || typeof( code ) === 'undefined' ) return;

        var jsonpArgs = {
            url: dojo.replace( this.googleGetConsumerTokenUrl, [ self.token ] ),
            content: {
                code: code
            },
            callbackParamName: "callback",
            preventCache: true,
            load: function( data ){
                if( data.status !== "success" ) {
                    console.log( "unable to fetch googleGetConsumerTokenUrl" );
                    dojo.publish("google-authorization", [{
                        status: data.status,
                        data: data.error
                      }]);
                    self.destroy();
                }
                else {
                    tokenObj = dojo.fromJson( data.data.data );
                    self._getGoogleTokenEmail( tokenObj );
                }
            },
            error: function(error){
                console.log( error );
                dojo.publish("google-authorization", [{
                    status: "error",
                    data: error
                  }]);

            }
        };
        dojo.io.script.get( jsonpArgs );
    },

    _getGoogleTokenEmail: function( tokenObj ) {
        var self = this;
        var getArgs = {
            url: dojo.replace( self.googleTokenEmailUrl, [ tokenObj.access_token ] ),
            preventCache: true,
            callbackParamName: "callback",
            load: function(data) {
                console.log
                if( !data.verified_email ) {
                    console.log( "error getting email from Google Oauth2 access_token" );
                    dojo.publish("google-authorization", [{
                        status: "error",
                        data: "no-google-email"
                    }]);
                    self.destroy();
                }
                else {
                    ecollege.toolbar.Toolbar.data.institution.googleEmail = data.email;
                    tokenObj.email = data.email;
                    self._saveTokens( tokenObj );
                }
            },
            error: function(error) {
                console.log( error );
                dojo.publish("google-authorization", [{
                    status: "error",
                    data: error
                }]);
                self.destroy();
            }
        }
        dojo.io.script.get( getArgs );
    },

    _saveTokens: function( tokenObj ) {
        var self = this;

        var args = {
            url: dojo.replace( self.googleSaveConsumerTokenUrl, [ self.token ] ),
            callbackParamName: "callback",
            preventCache: true,
            handleAs: 'json',
            headers: {
                "Content-Type": "application/json",
                "x-authorization": self.token
            },
            content: {
                  access: tokenObj.access_token,
                  refresh: tokenObj.refresh_token,
                  email: tokenObj.email,
                  expires_in: tokenObj.expires_in
            },
            load: function( data ) {
                if(data.status !== "success") {
                    console.log( "unable to save Tokens from Google" );
                    dojo.publish("google-authorization", [{
                        status: "error",
                        data: data.error
                    }]);
                    self.destroy();
                }
                else {

                    // Create Whittaker credential here

                    dojo.publish("google-authorization", [{
                        status: "success",
                        data: tokenObj
                        }]);
                    self.destroy();
                }
            },
            error: function( error ) {
                console.log( error );
                dojo.publish("google-authorization", [{
                    status: "error",
                    data: error
                }]);
                self.destroy();
            }
        };
        dojo.io.script.get( args );
    },

    _removeUser: function() {
        var self = this;

        var data = ecollege.toolbar.Toolbar.data;
        var googleEmail = data && data.profile && data.institution.googleEmail || null;

        if( !googleEmail ){
          console.log( "unable to remove user" );
          dojo.publish("google-remove", [ {
              status : "error",
              data : "no googleEmail provided"
          } ]);
          self.destroy();
        }

        console.log( googleEmail );
        var args = {
            url: dojo.replace( self.googleRemoveConsumerTokenUrl, [ self.token ] ),
            callbackParamName: "callback",
            preventCache: true,
            handleAs: 'json',
            content: {
              email: googleEmail
            },
            headers: {
                "Content-Type": "application/json",
                "x-authorization": self.token
            },
            load: function( data ) {
                if(data.status !== "success") {
                    console.log( "unable to remove user" );
                    console.log( data );
                    dojo.publish("google-remove", [ {
                        status : "error",
                        data : data
                    } ]);
                    self.destroy();
                }
                else {

                    ecollege.toolbar.Toolbar.data.institution.googleEmail = null;

                    dojo.publish("google-remove", [{
                        status: "success",
                        data: {
                          email: googleEmail
                        }
                    }]);
                    self.destroy();
                }
            },
            error: function( error ) {
                console.log( error );
                dojo.publish("google-remove", [{
                    status: "error",
                    data: error
                }]);
                self.destroy();
            }
        };
        console.log( args );
        dojo.io.script.get( args );
    },

    getUrlParameter: function(url, name) {
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var tokenParamResult = new RegExp( "[\\?&]" + name + "=([^&#]*)" ).exec( url )
        return (tokenParamResult) ? tokenParamResult[1] : null;
    },

    destroy: function() {
        this.inherited( arguments );
        dojo.forEach( this._childWidgets, function( w ) {
            w.destroyRecursive();
        });
    }
});
