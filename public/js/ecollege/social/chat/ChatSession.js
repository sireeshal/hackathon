// Provide the class
dojo.provide("ecollege.social.chat.ChatSession");

dojo.require("dojox.xmpp.xmppSession");

/**
	@class
	@author		maca
	
	@description
	<p>Provides functionality for facilitating an XMPP chat session via the eCollege XMPP server.</p>
*/
dojo.declare("ecollege.social.chat.ChatSession", null, {
	
	/************************************
		Public Properties
	************************************/
	
	userName: "",
	password: "",
	xmppServiceUrl: "",
	xmppDomain: "",
	
	/************************************
		Private Properties
	************************************/
	
	_xmppSession: null,
	_chatInstancesFromUserName: {},
	_useScriptSrcTransport: false,
	_createErrorMsg: "Unable to create a chat session. Missing property: ",
	_connectErrorMsg: "Unable to connect to the XMPP server.",
	_chatClientName: "eCollege Chat Client",
	
	
	/************************************
		Public Methods
	************************************/
	
	constructor: function(p_args) {
		dojo.mixin(this, p_args);
		
		if (this.userName === null || this.userName === undefined || this.userName.length < 1) {
            throw new Error(this._createErrorMsg + 'userName');
        }
        if (this.password === null || this.password === undefined || this.password.length < 1) {
            throw new Error(this._createErrorMsg + 'password');
        }
        if (this.xmppServiceUrl === null || this.xmppServiceUrl === undefined || this.xmppServiceUrl.length < 1) {
            throw new Error(this._createErrorMsg + 'xmppServiceUrl');
        }
		if (this.xmppDomain === null || this.xmppDomain === undefined || this.xmppDomain.length < 1) {
            throw new Error(this._createErrorMsg + 'xmppDomain');
        }
		
		// don't check for cross domain for now. ejabberd server is not capable of doing JSONP communication.
		//this._useScriptSrcTransport = this._isXDomain(this.xmppServiceUrl);
		
	},
	
	login: function() {
				
		// Create an XMPP Session object
		this._xmppSession = new dojox.xmpp.xmppSession({
			serviceUrl: this.xmppServiceUrl,
			hold: 1,
			secure: false,
			useScriptSrcTransport: this._useScriptSrcTransport,
			wait: 60,
			lang: 'en',
			retryCount: 2,
			domain: this.xmppDomain
		});
		
		
		// Start up a session
		this._xmppSession.open(this.userName, this.password, this._chatClientName);
		
		
		// If login fails, bubble up an error
		dojo.connect(this._xmppSession, 'onLoginFailure', this, function(msg) {
			if (dojo.config.isDebug) console.log(this.declaredClass + ": " + msg);
			if (dojo.config.isDebug) console.log(this.declaredClass + ": " + this._connectErrorMsg);
			this.onError();
		});

		// When the connection is active, subscribe to presence
		// We won't use presence on our end, but have to let the server know we're here
		dojo.connect(this._xmppSession, 'onActive', this, function() {
			this._xmppSession.presenceService.publish({});
		});

		// This'll indicate that we've actually successfully fully signed in
		dojo.connect(this._xmppSession, 'onLogin', this, function() {
			
			// listen for an initial chat message to be received
			dojo.connect(this._xmppSession, 'onRegisterChatInstance', this, this._onNewChatInstance);

			dojo.connect(this._xmppSession, 'onTerminate', this, this._onChatTerminate);
			
			// Fire off our signin
			this.onLogin();
		});
	},
	
	logout: function() {
		// Close out and nullify our xmpp session
        if (this._xmppSession) {
            this._xmppSession.close();
            this._xmppSession = null;
			this.onLogout();
        }
	},
	
	sendMessage: function(p_message, p_recipient) {
		var instance = this._chatInstancesFromUserName[p_recipient];
		
		if (!instance){
			instance = new dojox.xmpp.ChatService();
			this._xmppSession.registerChatInstance(instance, p_message);
			instance.invite(p_recipient + '@' + this.xmppDomain);
			this._chatInstancesFromUserName[p_recipient] = instance;
			
			//TODO: Store reference to handler and disconnect it when chat tab is closed
			dojo.connect(instance, 'onNewMessage', this, '_onReceiveMessage');
		}
		
		instance.sendMessage(p_message);
	},
	
	onChatTerminate: function(p_newState, p_oldState, p_message) { },
	onReceiveMessage: function(p_message, p_userName) {	},
	onLogin: function() { },
	onLogout: function() { },
	onError: function() { },
	
	/************************************
		Private Methods
	************************************/

	_onNewChatInstance: function(p_instance, p_message) {
		// if we are initiating the chat, we don't care about this event
		if (!p_instance.uid) {
			return;
		}
		if (dojo.config.isDebug) console.log(this.declaredClass + ": A new chat has been started");
		if (dojo.config.isDebug) console.log(this.declaredClass + ": Instance: ", p_instance);
		if (dojo.config.isDebug) console.log(this.declaredClass + ": Message: ", p_message);

		var username = p_instance.uid.substring(0, p_instance.uid.indexOf('@'));
		
		this._chatInstancesFromUserName[username] = p_instance;
		
		dojo.connect(p_instance, 'onNewMessage', this, '_onReceiveMessage');
		
		this.onReceiveMessage(p_message, username);
	},

	_onChatTerminate: function(p_newState, p_oldState, p_message) {
		// forward event on
		this.onChatTerminate();
	},

	_onReceiveMessage: function(p_message) {
		// forward event on
		var username = p_message.from.substring(0, p_message.from.indexOf('@'));
		this.onReceiveMessage(p_message, username);
	},

	_isXDomain: function(p_url)
	{
		var requestOrigin = this._getOriginOfUrl(p_url);
		var documentOrigin = this._getOriginOfUrl(window.location.href);
		return (requestOrigin !== documentOrigin);
	},
	
	_getOriginOfUrl: function(p_url)
	{
		// "http://" or "https://"
		var protocol = p_url.replace(/([a-zA-Z0-9]*?:\/\/).*?(\/.*|$)/, "$1");
		var domain = p_url.replace(/[a-zA-Z0-9]*?:\/\/(.*?)(\/.*|$|:\d+.*)/, "$1");
		var port = p_url.replace(/[a-zA-Z0-9]*?:\/\/.*?(:\d+)?($|\/.*)/, "$1");
		return protocol + domain + port;
	}
	
});