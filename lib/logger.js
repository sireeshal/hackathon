// the actual handle to the instance of winston's custom logger
var logger = null;

// the general winston library handle
var winston = require( 'winston' );

// a lookup table of valid log levels
var logLevels = {};

// clamps an err value ->Error()->String, to ensure it can be text logged easily
function exceptionToMessage( err ) {

	// clamping
	if ( !(err instanceof Error) ) {
		err = {
			message:err,
			stack:false
		};
	}

	// build message
	var message = "UNCAUGHT_EXCEPTION: " + JSON.stringify( err.message );
	if ( err.stack ) {
		message += " STACK:" + JSON.stringify( err.stack );
	}

	return message;
}

// dummy initial log function (replaced in init)
module.exports.log = function ( level, message, meta ) {
	console.log( 'Logger not initialized for:', level, message, meta );
};

// get a logger config formatted for express's logging middle-ware
module.exports.expressLoggerConfig = function () {
	return {
		format:':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
		stream:{ // fake stream
			write:function ( str ) {
				module.exports.log( 'web_access', str );
			}
		}
	};
};

// initialize logging
module.exports.init = function ( config ) {

	var options = {},
		iLevel = 0,
		level = null,
		levelName = null,
		loadedLoggingTransports = 0, // count the number of transports we are using
		transport = null,
		transportType = null;

	// see if custom levels passed
	if ( config.levels && config.levels.length > 0 ) {

		// build the levels option field
		options.levels = {};
		for ( iLevel = 0; iLevel < config.levels.length; iLevel++ ) {

			// cache
			level = config.levels[iLevel];

			// if there is no level name, or if the name is duplicate, skip this entry
			if ( !level.name || options.levels[level.name] ) {
				continue;
			}

			// create the level numeric index lookup
			options.levels[level.name] = iLevel;

			// if custom color, store it in a custom level colors field
			if ( level.color ) {
				if ( !options.levelColors ) {
					options.levelColors = {};
				}
				options.levelColors[level.name] = level.color;
			}
		}
	}

	logger = new (winston.Logger)( options );

	// make lookup table for use when logging, so we don't try to log on non-existent levels
	if ( options.levels ) {
		logLevels = {};
		for ( levelName in options.levels ) {
			if ( !options.levels.hasOwnProperty( levelName ) ) {
				continue;
			}
			logLevels[levelName] = true;
		}
	} else {
		logLevels = {
			info:true,
			warn:true,
			error:true
		};
	}

	// we had custom colors, set them
	if ( options.levelColors ) {
		winston.addColors( options.levelColors );
	}

	// load each transport from configs
	for ( var j = 0; j < config.transports.length; j++ ) {

		// cache
		transport = config.transports[j];

		// clamping
		if ( !transport.options ) {
			transport.options = {};
		}

		// transport type specific config
		transportType = null;
		switch ( transport.type ) {
			case "FILE":
				if ( !transport.options.filename ) {
					continue;
				}
				transportType = winston.transports.File;
				break;
			case "CONSOLE":
				transportType = winston.transports.Console;
				break;
			default:
				continue;
		}

		// we remove the default transport (if it exists)
		try {
			logger.remove( transportType );
		} catch ( e ) {
			// NO-OP
		}

		// add the transport
		logger.add( transportType, transport.options );

		// var maintenance
		loadedLoggingTransports++;
	}

	// not enough transports
	if ( loadedLoggingTransports < 1 ) {
		throw ("FATAL: No logging transports defined, its bad to log nothing.");
	}

	// initialize the actual logging function
	module.exports.log = function ( level, message, meta ) {

		// avoid logging loop with nested uncaught exception errors
		try {
			if ( logLevels && logLevels[level] ) {
				logger.log.apply( logger, arguments );
			}
		} catch ( err ) {
			try {
				console.log( 'UNCAUGHT EXCEPTION WHILE LOGGING:', exceptionToMessage( err ) );
			} catch ( errIgnore ) {
				// umm, this is awkward-an exception within an exception-I guess we just
				// ignore this and hope something else catches it elsewhere.
			}
		}

	};

	// finally, logging for all uncaught exceptions
	process.on( 'uncaughtException', function ( err ) {

		// log message
		module.exports.log( 'error', exceptionToMessage( err ) );

	} );

	return true;
};
