// Provide the class
dojo.provide("ecollege.toolbar.socialdata.KeepMeOnline");

// Dependencies
dojo.require("ecollege.toolbar.socialdata.ServiceManager");
dojo.require("dojo.DeferredList");
dojo.require("dojox.timing");

/**
	@class
	@author		gregt
	
	@description
	<p>Discrete class that performs a ping to presence for the currently logged in user. The timer
	interval is automatically performed based on the presence pingrate service. A new pingrate is
	acquired each time a new ping is made. The class will begin working immediately on instantiation.</p>
*/
dojo.declare("ecollege.toolbar.socialdata.KeepMeOnline", null, {
	
	/************************************
		Public Methods
	************************************/
	
	/**
		Constructor. Initialize default vars and forward the required service config hash to the serviceMgr instance.
		@param	{object}	p_serviceConfig		Required config object for the service manager. See ServiceManager class for details.
		@public
	*/
	constructor: function(p_serviceConfig) {
		
		// declare private class properties
		this._serviceMgr = null;
		this._pingIntervalMs = null;
		this._pingTimer = null;
		this._myPersonaId = null;
		
		// initialize class properties
		this._serviceMgr = new ecollege.toolbar.socialdata.ServiceManager(p_serviceConfig || null);
		this._pingIntervalMs = 60000;
		this._pingTimer = new dojox.timing.Timer();
		this._pingTimer.setInterval(this._pingIntervalMs);
		this._pingTimer.onTick = dojo.hitch(this, this._ping);
		
		// begin
		this._getPrimaryData();
	},
	
	/**
		Used to set the user's online status to offline. Stops the interval from starting the pingning again.
		@public
	*/
	stop: function() {
		if (this._pingTimer.isRunning) this._pingTimer.stop();
		
		// do we care if this call fails?
		var endPing = this._serviceMgr.request({
			destination: this._serviceMgr.AFFINITY_PRESENCE,
			verb: this._serviceMgr.DELETE,
			target: "/Affinity/v1/presence/people/" + this._myPersonaId
		});
	},

	/************************************
		Private Methods
	************************************/
	
	/**
		Broadcasts an event to all subscribers with an error message
		@private
	*/
	_broadcastError: function(p_response) {
		//console.log("KeepMeOnline._broadcastResults()");
		dojo.publish("/ecollege/toolbar/socialdata/KeepMeOnline/error", [p_response]);
	},
	
	
	/*********************************************
		Private Methods for Ping Routine
	*********************************************/
	
	/**
		Kicks off the first group in a series of chained web service calls to get the primary pinging data for the class. We
		only get the primary data once, on instantiation, and after that we only hit select services every time we ping.
		@private
	*/
	_getPrimaryData: function() {
		//console.log("KeepMeOnline._getPrimaryData()");
		this._getMe();
	},
	
	/**
		Call the /me service so that we can construct my persona id. Then we can initialize the intervalled pings to presence.
		@private
	*/
	_getMe: function() {
		//console.log("KeepMeOnline._getMe()");
		
		var getMe = this._serviceMgr.request({
			destination: this._serviceMgr.WSOD,
			verb: this._serviceMgr.GET,
			target: "/me/" // trailing slash is workaround for IE anti-cache salting bug in /me service
		});
		
		getMe.then(dojo.hitch(this, this._handleMeSuccess), dojo.hitch(this, this._handlePrimaryAjaxFailure));
	},
	
	/**
		Pings the current user in presence to keep them online. Also makes a call to get the latest ping rate.
		@public
	*/
	_ping: function() {
		//console.log("KeepMeOnline._ping()");
		
		if (this._pingTimer.isRunning) this._pingTimer.stop();
		
		var postPing = this._serviceMgr.request({
			destination: this._serviceMgr.AFFINITY_PRESENCE,
			verb: this._serviceMgr.POST,
			target: "/Affinity/v1/presence/people/" + this._myPersonaId
		});
		
		var getPingRate = this._serviceMgr.request({
			destination: this._serviceMgr.AFFINITY_PRESENCE,
			verb: this._serviceMgr.GET,
			target: "/Affinity/v1/presence/pingrate"
		});
		
		var callGroup = new dojo.DeferredList([postPing, getPingRate], false, true);
		callGroup.addCallback(dojo.hitch(this, this._handlePingSuccess));
		callGroup.addErrback(dojo.hitch(this, this._handleIntervalledAjaxFailure));
	},
	
	/************************************
		Callbacks
	************************************/
	
	/**
		Handles a failure from one of the primary ajax calls. This error is considered terminal and should
		be reported to the consumer.
		for the consumer.
		@param	{Object}	p_response	The error information
		@private
	*/
	_handlePrimaryAjaxFailure: function(p_response) {
		console.error("ecollege.toolbar.socialdata.KeepMeOnline._handlePrimaryAjaxFailure()");
		
		if (p_response.data) {
			// this error prevented us from compiling the primary data source so report it to the consumer
			this._broadcastError(p_response);
		}
	},
	
	/**
		Handles a failure from one of the intervalled ajax calls. This error can be hidden from the consumer.
		@param	{Object}	p_response	The error information
		@private
	*/
	_handleIntervalledAjaxFailure: function(p_response) {
		console.error("ecollege.toolbar.socialdata.KeepMeOnline._handleIntervalledAjaxFailure()");
		
		// This error is from an intervalled ajax call and will be retried at the next interval.
	},
	
	/**
		Constructs the user's persona id from the results of the /me request.
		@param	{Object}	p_results	Results for /me
		@private
	*/
	_handleMeSuccess: function(p_results) {
		//console.log("KeepMeOnline._handleMeSuccess()");
		var me = p_results.data.me;
		this._myPersonaId = me.clientString.toLowerCase() + "_" + me.userName;
		// initiate the first ping
		this._ping();
	},
	
	/**
		Handles the response from the presence ping to self
		@param	{Object}	p_results	The affinity presence data
		@private
	*/
	_handlePingSuccess: function(p_results) {
		//console.log("KeepMeOnline._handlePingSuccess()");
		
		var pingRateResponse;
		
		// pull the presence response from the p_results object. The p_results object is basically an array of
		// deferred array results returned by the deferredlist.
		dojo.forEach(p_results, function(iResult) {
			if (iResult[0] == true && iResult[1].data && iResult[1].data.rate) pingRateResponse = iResult[1].data;
		});

        var rate = pingRateResponse && pingRateResponse.rate >= 1 ? pingRateResponse.rate : 60;
		this._pingIntervalMs = parseInt(rate*1000);
		this._pingTimer.setInterval(this._pingIntervalMs);
		this._pingTimer.start();
	}
	
});
