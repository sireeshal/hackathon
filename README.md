OpenClass Toolbar
=================

A common toolbar used through OpenClass that is an embeddable javascript widget and backing services.

The toolbar does the following things:

* Understands the institution context of the currently logged in user
* Can accept either a Whittaker or MOAuth token when embeded
* Loads institutional branding CSS
* Conditionally loads the 'Admin' or 'Uber Admin' links based on permissions
* Loads students' course list
* Links to Whittaker Admin
* Conditionally loads Google Docs, Email, Calendar Widgets
* Who's Online and Chat integration


more details ...

The toolbar also provides a public client-side API to do the following:

 * Initiate the web-flow
 * Get a user's information
 * Remove a user

API Details:

 * startGoogleWebFlow( boolean )
 
  * boolean 
     - true: Force the user to authorize their account even if they already have. A new refresh token will also be generated. This should almost always be set to true.
     - false: Only generate a new Google access token.
 
 Starts the Google service web-flow. Presents the following results VIA the google-authorization topic using dojo.subscribe
  * success - the web-flow was successful and access tokens are stored in chamber and whittaker.
  * popup-blocked - user's pop-up blocker blocked the window from opening
  * error - an error has occurred, further information is in the data property


 Example:
               
          var force = true;
          var toolbarApi = window.ecollege.toolbar.Toolbar.api;
          toolbarApi.startGoogleWebFlow( force );
          var msgTokenObj = dojo.subscribe( 'google-authorization', function( message ) {
              if( message.status === 'success') {
                  //do something successful
                  console.log( message.data );
              }
              if( message.status === 'popup-blocked' ) {
                  console.log( 'Unable to load popup' );
                  console.log( message.data );
              }
              if( message.status === 'error' ) {
                  console.log( 'An error occurred: ' + message.data || '' );
                  console.log( 'web-flow completed with error' );
              }
              dojo.unsubscribe( msgTokenObj );
              } );
          }

 * getUser()
 
 Returns the current user information according to the toolbar.

 Example:
                         
          var toolbarApi = window.ecollege.toolbar.Toolbar.api;
          toolbarApi.getUser();
  
          Returns:
          var user = {
              name: //user's name,
              avatar: //user's avatar uri,
              email: //user's email,
              is_google: //is this a google user? - boolean,
              google_type: //domain, consumer, null 
          }


 * removeUser()
 
 Removes the current user from the chamber service and removes whittaker credentials.

 Example:

            var toolbarApi = window.ecollege.toolbar.Toolbar.api;
            toolbarApi.removeGoogleUser();
            var msgRemoveUserObj = dojo.subscribe( 'google-remove', function( message ) {
                if( message.status === 'success') {
                    // Do something successful
                }
                else {
                    console.log('An error occurred' + ( ( (message.data && message.data.error)  === 'not-found' ) ? ': user not found' : '' ) );}
                } );
                dojo.unsubscribe( msgRemoveUserObj );
             } );
 
 * reloadCollaborations()
             
 Reloads Collaborations while collaborations is loaded.

 Example:

            var toolbarApi = window.ecollege.toolbar.Toolbar.api;
            toolbarApi.reloadCollaborations();

 * getServices()
             
 Returns an array of available web services.

 Example:

            var toolbarApi = window.ecollege.toolbar.Toolbar.api;
            toolbarApi.getServices();
            
            Returns:
            [ 'google', 'skype' ]
