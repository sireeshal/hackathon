// Provide the class
dojo.provide("ecollege.social.chat.ChatManager");

dojo.require("ecollege.social.chat.ChatSession");
dojo.require("ecollege.social.chat.ChatDialog");

/**
	@class
	@author		maca
	
	@description
	<p>This class hooks up the UI with the xmpp session.</p>
*/
dojo.declare("ecollege.social.chat.ChatManager", null, {
	
	/************************************
		Public Properties
	************************************/
	
	chatSession: null,
	chatUI: null,
	chatNode: null,
	dataAdapter: null,
	chatUsersData: null,
	isLoggedIn: false,
	hasData: false,

	chatsToInitiate: {},
	
	/************************************
		Public Methods
	************************************/
	
	constructor: function(p_sessionCredentials, p_containerNode){
		this.chatSession = new ecollege.social.chat.ChatSession(p_sessionCredentials);
		this.chatNode = (typeof(p_containerNode) === "string") ? dojo.byId(p_containerNode) : p_containerNode;
		
		dojo.connect(this.chatSession, "onLogin", this, "_initializeUI");
		dojo.connect(this.chatSession, "onLogout", this, "onLogout");
		dojo.connect(this.chatSession, "onError", this, "onLoginError");

		dojo.subscribe("/ecollege/social/chat/initiateChat", this, "initiateChatWithUser"); // always use this channel
		dojo.subscribe("/ecollege/chat/initiateChat", this, "initiateChatWithUser"); // here for backwards compatibility only

		// listen for changes in online status for users, and update chat as necessary
		dojo.subscribe("/ecollege/social/chat/updateUserStatus", this, function(p_eventData) {
			if (!this.chatUsersData) {
				this.chatUsersData = {};
				dojo.forEach(p_eventData, function(item) {
					this.chatUsersData[item.personaId] = item;
				}, this);
			}
			
			// initiate any chats that may have been attempted before this event was received
			this._initiatePendingChats();

			if (this.chatUI) {
				this.chatUI.updateChatUsersData(this.chatUsersData);
			}
		});

		this.chatSession.login();
	},
	
	onLogin: function(){},
	onLoginError: function(){},
	onLogout: function(){},
	
	initiateChatWithUser: function(p_personaId){
		if (!p_personaId) {
			if (dojo.config.isDebug) console.log(this.declaredClass + ": Unable to initiate chat. User is undefined/null");
		}
		if (!this.chatUI) {
			if (dojo.config.isDebug) console.log(this.declaredClass + ": Attempting to initiate a chat when user is not yet logged in.");
			this.chatsToInitiate[p_personaId] = {message: null};
		}
		else {
			var user = this._generateUserObject(p_personaId);
			if (user) {
				this.chatUI.createNewChat(user);
			}
			else {
				this.chatsToInitiate[p_personaId] = {message: null};
				if (dojo.config.isDebug) console.log(this.declaredClass + ": Unable to start chat session with: " + p_personaId + ". Persona data is not available yet");
			}
		}
	},
	
	/************************************
		Private Methods
	************************************/
	
	_onLogin: function() {
		this.isLoggedIn = true;
		if (this.hasData) this._initializeUI();
	},

	_initializeUI: function(){
		
		this.chatUI = new ecollege.social.chat.ChatDialog({
			title: "Chat Window",
			me: this.chatSession.userName
		}, this.chatNode);
		
		// connect the receive message event to the UI
		dojo.connect(this.chatSession, "onReceiveMessage", this, "_receiveMessageHandler");

		dojo.connect(this.chatSession, "onChatTerminate", this.chatUI, "addTerminateMessage");
		
		// connect the send message event to the chat session
		dojo.connect(this.chatUI, "onSendMessage", this.chatSession, "sendMessage");
		
		// initiate any chats that may have been attempted before initialization was done
		this._initiatePendingChats();
		
		// fire onLogin method
		this.onLogin();
	},

	_initiatePendingChats: function() {
		var stillPending = {};
		var item;
		for (var prop in this.chatsToInitiate) {
			item = this.chatsToInitiate[prop];
			var user = this._generateUserObject(prop);
			if (user && this.chatUI) {
				this.chatUI.addMessage(item.message, user);
			}
			else {
				stillPending[prop] = item;
				if (dojo.config.isDebug) console.log(this.declaredClass + ": Unable to start chat session with: " + prop + ". Persona data is not available yet");
			}
		}
		// assign any chats that are still pending due to persona data not being received yet
		this.chatsToInitiate = stillPending;
	},

	_receiveMessageHandler: function(p_message, p_personaId) {
		var user = this._generateUserObject(p_personaId);

		if (user) {
			this.chatUI.addMessage(p_message, user);
		}
		else {
			if (dojo.config.isDebug) console.log(this.declaredClass + ": Attempting to initiate a chat with an unknown user.");
			this.chatsToInitiate[p_personaId] = {message: p_message};
		}
	},

	_generateUserObject: function(p_userName) {
		if (this.chatUsersData) {
			var userData = this.chatUsersData[p_userName];
			var user = {
				avatarSrc: (userData) ? userData.avatarUrl : "",
				personaId: p_userName,
				fullName: (userData) ? userData.longDisplayName : ""
			}
			return user;
		}
		return null;
	}

	
	
	
});