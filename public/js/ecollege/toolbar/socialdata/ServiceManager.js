// Provide the class
dojo.provide("ecollege.toolbar.socialdata.ServiceManager");


/**
	@class
	@author		gregt
	
	@description
	<p>Handles rest based service calls for wsod and affinity.</p>
	<p>** Dependent on ecxd.AjaxManager.js for xdomain ajax **</p>
*/
dojo.declare("ecollege.toolbar.socialdata.ServiceManager", null, {
	
	/************************************
		Static Constants
	************************************/
	
	// destination
	AFFINITY_PRESENCE: "affinityPresence",
	AFFINITY_PERSONA: "affinityPersona",
	WSOD: "wsod",
	// verb
	GET: "get",
	POST: "post",
	PUT: "put",
	DELETE: "delete",
	
	/************************************
		Public Methods
	************************************/
	
	/**
		Constructor. Optionally set the config at instantiation.
		@public
	*/
	constructor: function(p_config) {
		
		// declare private class properties
		this._config = {
			// Base url required for various web services. The target uri from a request is simply appended to this base url.
			baseUrl: {
				wsod: null, // required (eg: http://m-api.ecollege-labs.com)
				affinityPresence: null, // required (eg: http://presencedev.petdev.com)
				affinityPersona: null // required (eg: http://personadev.petdev.com)
			},
			// Access tokens required to access various services.
			tokenFunctions: {
				getXAuth: null, // required
				getAffinityAuth: null // required
			},
			// AjaxManager instance to use for service calls
			ajaxManager: null // required
			
	 	};
	 	this._requestsById = {};
		
		// initialize the config
		this._createServiceConfig(p_config);
	},
	
	/**
		Returns the service config for curious consumers.
		@public
	*/
	getServiceConfig: function() {
		return this._config;
	},
	
	/**
		New webservice request.
		Returns a dojo.deferred.
		
		p_options has can include the following properties:
			destination: {string} 	[required]	Destination service (eg: Wsod or Affinity). Used to determine base url and auth method. Use class constant.
			verb: {string}		[required]	Http verb. Use class constant.
			target: {string} 	[required]	Uri for the webservice call. Begin with a slash and omit the base url.
			querystring: {object} 	[optional]	Querystring to append to the URI, represented as an object
			payload: {string} 	[optional]	Payload to include in a post or put request, represented as a string.
			
		@public
	*/
	request: function(p_options) {
		
		if (!this._validateRequestOptions(p_options)) {
			console.error("ecollege.toolbar.socialdata.ServiceManager.request(): ERROR: A required option parameter is missing or invalid.");
			return null;
		}
		
		if (!this._config.isValid) {
			console.error("ecollege.toolbar.socialdata.ServiceManager.request(): ERROR: Service Config Object Failed Validation.");
			return null;
		}
		
		var options = {};
		options.destination = p_options.destination;
		options.verb = p_options.verb;
		options.target = p_options.target;
		options.querystring = p_options.querystring ? dojo.objectToQuery(p_options.querystring) : null;
		options.payload = p_options.payload || null;
		options.flushResponseCache = p_options.flushResponseCache || null;
		
		//console.log("ServiceManager.request: " + options.verb + ": " + this._config.baseUrl[options.destination] + options.target, p_options);
		
		var self = this;
		var ajax = this._config.ajaxManager;
		var url = this._config.baseUrl[options.destination] + options.target;
		var headers = {};
		
		if (options.destination == this.AFFINITY_PRESENCE || options.destination == this.AFFINITY_PERSONA ) {
			url += "?Authorization=" + this._config.tokenFunctions.getAffinityAuth();
			if (options.querystring) {
				url += "&" + options.querystring;
			}
		}
		else if (options.destination == this.WSOD) {
			if (options.querystring) {
				url += "?" + options.querystring;
			}

			headers["X-Authorization"] = "Access_Token access_token=" + (this._config.tokenFunctions.getXAuth());
		}
		
		var preventCaching = (dojo.isIE && dojo.isIE < 9);
		var reqId = ajax.request({
			type: options.verb,
			url: url,
			requestHeaders: headers,
			data: options.payload,
			successHandler: dojo.hitch(self, self._ajaxSuccess),
			errorHandler: dojo.hitch(self, self._ajaxError),
			preventCache: preventCaching,
			flushResponseCache: options.flushResponseCache
		});
		
		this._requestsById[reqId] = {};
		this._requestsById[reqId].deferred = new dojo.Deferred();
		this._requestsById[reqId].options = options;
		return this._requestsById[reqId].deferred;
	},
	
	/************************************
		Private Methods
	************************************/
	
	/**
		Creates the service config.
		@public
	*/
	_createServiceConfig: function(p_config) {
		//console.log("ServiceManager._createServiceConfig()", p_config);
		
		if (!this._validateConfig(p_config)) {
			this._config.isValid = false;
			console.error("ecollege.toolbar.socialdata.ServiceManager.constructor: ERROR: Service Config Object Failed Validation.");
			return;
		}
		
		this._config.isValid = true;
		
		this._config.baseUrl.affinityPresence 		= p_config.baseUrl.affinityPresence;
		this._config.baseUrl.affinityPersona 		= p_config.baseUrl.affinityPersona;
		this._config.baseUrl.wsod 			= p_config.baseUrl.wsod;
		
		this._config.tokenFunctions.getXAuth 		= p_config.tokenFunctions.getXAuth;
		this._config.tokenFunctions.getAffinityAuth	= p_config.tokenFunctions.getAffinityAuth;
		
		this._config.ajaxManager			= p_config.ajaxManager;
	},
	
	/**
		Returns true if the config object is valid and false if its not		
		@private
	*/
	_validateConfig: function(p_config) {
		if (!p_config) return false;
		if (!p_config.baseUrl || !p_config.baseUrl.affinityPresence || !p_config.baseUrl.affinityPersona || !p_config.baseUrl.wsod) return false;
		if (!p_config.tokenFunctions || !p_config.tokenFunctions.getXAuth || !p_config.tokenFunctions.getAffinityAuth) return false;
		if (!p_config.ajaxManager) return false;
		return true;
	},
	
	/**
		Returns true if the options are valid and false if they are not
		@private
	*/
	_validateRequestOptions: function(p_options) {
		if (p_options.destination && p_options.verb && p_options.target) {
			if (p_options.destination != this.AFFINITY_PRESENCE && p_options.destination != this.AFFINITY_PERSONA && p_options.destination != this.WSOD) {return false;}
			if (p_options.verb != this.GET && p_options.verb != this.POST && p_options.verb != this.PUT && p_options.verb != this.DELETE) {return false;}
			return true;
		}
		return false;
	},
	
	/**
		AjaxManager success handler
		@private
	*/
	_ajaxSuccess: function(p_params) {
		//console.log("ServiceManager._ajaxSuccess()", p_params);
		var req = this._requestsById[p_params.transactionId].deferred;
		delete this._requestsById[p_params.transactionId];
		req.callback(p_params);
	},
	
	/**
		AjaxManager error handler
		@private
	*/
	_ajaxError: function(p_params) {
		console.error("ecollege.toolbar.socialdata.ServiceManager._ajaxError()", p_params);
		dojo.publish("/ecollege/toolbar/socialdata/ServiceManager/error/" + p_params.statusCode);
		var request = this._requestsById[p_params.transactionId];
		var req = request.deferred;
		delete this._requestsById[p_params.transactionId];
		req.errback(p_params);
	}
});