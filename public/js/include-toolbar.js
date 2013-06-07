(function ( global ) {

  var script_elements = document.getElementsByTagName( 'script' )
    , this_script
    , attr
    , i = script_elements.length;

  while ( i-- ) {
    if ( (script_elements[i].getAttribute( "src" ) || "").indexOf( "/include-toolbar.js" ) > 0 ) {
      this_script = script_elements[i];
      break;
    }
  }

  function getParameter( url, name ) {
    var tokenParamResult = new RegExp( "[\\?&]" + name + "=([^&#]*)" ).exec( url )
    return (tokenParamResult) ? tokenParamResult[1] : null;
  }

  var match_absolute = this_script.getAttribute( "src" ).match( new RegExp( 'https?://[^/]*' ) )
  var config = {
    server: (match_absolute && match_absolute[0]) || window.location.protocol + "//" + window.location.host,
  };

  // parse out any of the data- tags, and conver config values stripping the data- and converting
  // underscores to dashes
  for ( var i = 0, l = this_script.attributes.length; i < l; i++ ) {
    attr = this_script.attributes[i];
    if ( attr.name.indexOf( "data-" ) == 0 ) {
      config[ attr.name.substring( 5 ).replace( /\-/g, "_" ) ] = attr.value;
    }
  }

  function RecordStat() {
    this.start = new Date().getTime();
    this.total = 0;
  }

  RecordStat.prototype = {

    record: function ( name ) {

      var diff = new Date().getTime() - this.start;
      this.start = new Date().getTime();
      this.total += diff;

      this._log( {
        name: name,
        time: this.total
      } );

    },

    _log: function ( data ) {

      var url = config.server + '/stats/timer/' + data.name.split( /\s+/ ).join( '.' ) + '/' + data.time + '?_=' + Math.floor( Math.random() * 999999 ) + '.' + new Date().getTime();
      var head = document.getElementsByTagName( 'head' )[0];
      var script = document.createElement( 'script' );
      script.type = 'text/javascript';
      script.src = url;
      head.appendChild( script );

    }
  };

  window.TIMERSTAT = new RecordStat();

  // to override config properties before including toolbar:
  // attributes in the script tag tack precedence over config object
  // dojo.setObject("ecollege.toolbar.Toolbar.config", { });

  var versionedPath = ("{VERSION}".indexOf( "VERSION" ) > 0) ? "" : "{VERSION}/"
  dojo.registerModulePath( 'ecollege.toolbar', config.server + '/js/' + versionedPath + 'ecollege/toolbar' );
  if ( dojo.getObject( "ecollege.toolbar.Toolbar.config", true ).manage_social_data != false ) {
    dojo.registerModulePath( 'ecollege.toolbar.socialdata', config.server + '/js/' + versionedPath + 'ecollege/toolbar/socialdata' );
  }
  if ( dojo.getObject( "ecollege.toolbar.Toolbar.config", true ).manage_social_chat != false ) {
    dojo.registerModulePath( 'ecollege.social.chat', config.server + '/js/' + versionedPath + 'ecollege/social/chat' );
  }
  dojo.require( 'ecollege.toolbar.toolbarwidgets' );

  dojo.addOnLoad( function () {
    initializeToolbar();
  } );

  // an IE 8 but seems to be causeing addOnLoad to fire before global.ecollege is defined
  function initializeToolbar() {
    if ( global.ecollege && global.ecollege.toolbar && global.ecollege.toolbar.Toolbar && global.ecollege.toolbar.Toolbar.init ) {
      global.ecollege.toolbar.Toolbar.init( config );
    }
    else {
      setTimeout( initializeToolbar, 50 );
    }
  }
}( this ));
