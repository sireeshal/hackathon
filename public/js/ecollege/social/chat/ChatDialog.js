// Provide the class
dojo.provide("ecollege.social.chat.ChatDialog");

dojo.require('dijit._Widget');
dojo.require('dijit._Templated');
dojo.require("dijit.layout.TabContainer");
dojo.require('dijit.Dialog');
dojo.require("dijit.form.Button");
dojo.require("ecollege.social.chat.ChatContainer");

/**
	@class
	@author		maca
	
	@description
	<p>A UI element for displaying one or more chat conversations within a dialog window.</p>
*/
dojo.declare("ecollege.social.chat.ChatDialog", [dijit._Widget, dijit._Templated], {
	
	/************************************
		Public Properties
	************************************/
	
	baseClass: 'claro chatContainer',
	templateString: dojo.cache("ecollege.social.chat","resources/ChatDialog.html"),
	widgetsInTemplate: true,
	chatTabContainer: null,
	loadSavedSessionsOnCreation: false,
	saveOpenSessions: false,
	me: "",
	isTerminated: false,

	defaultWidth: 300,
	defaultHeight: 360,
	
	chatContainersFromUserId: {},
	sendMessageHandlersFromChatContainerID: {},
	
	/************************************
		Public Methods
	************************************/
	
	constructor: function() {
		this.style = "position: fixed; right: 0px; bottom: 0px;"
	},
	
	postCreate: function(){
		this.inherited(arguments);
		// hide it to begin with, but display cannot be none, otherwise it won't render properly
		this.chatTabContainer = new dijit.layout.TabContainer({
			style: "width: " + this.defaultWidth + "px; height: " + this.defaultHeight + "px; opacity: 0;"
		}, this.chatTabContainerNode);
		this.chatTabContainer.startup();
		
		this._hideChatButton();
		
		// since the original chatTabContainerNode gets removed from the dom and 
		// replaced by the tab container, let's reassign the chatTabContainerNode
		this.chatTabContainerNode = this.chatTabContainer.domNode;
		
		// now that startup has been run, let's hide it by setting display to none
		dojo.style(this.chatTabContainerNode, "display", "none");
		dojo.style(this.chatTabContainerNode, "z-index", "999");
		dojo.style(this.chatTabContainerNode, "opacity", "100");
		
		dojo.connect(this.chatTabContainer, "closeChild", this, this._closeChild);

		dojo.connect(this.chatTabContainer, "selectChild", this, function(p_child) {
			p_child.fixScrollPos();
		});
		
		if (this.loadSavedSessionsOnCreation) {
			this._launchSavedSessions();
		}
	},
	
	
	addMessage: function(p_message, p_user){
		if (this._isChatButtonHidden()){
			this._showChatButton();
		}
		if (this._isHidden()){
			this._toggleChatButtonIcon(true);
		}
		if (!this.chatContainersFromUserId[p_user.personaId]){
			this.createNewChat(p_user);
		}
		if (p_message) {
			this.chatContainersFromUserId[p_user.personaId].displayMessage(p_message, p_user.fullName, true);
		}
		
	},

	addTerminateMessage: function(p_newState, p_oldState, p_message) {
		this.isTerminated = true;
		for (var prop in this.chatContainersFromUserId) {
			this.chatContainersFromUserId[prop].displayMessage({ body: "Your connection to the chat server has been terminated. Please reload the page to reconnect."}, "system", false);
		}
	},
	
	
	createNewChat: function(p_user)
	{
		var cc = this.chatContainersFromUserId[p_user.personaId];
		if (!cc) {
			cc = new ecollege.social.chat.ChatContainer({
				title: p_user.fullName,
				userId: p_user.personaId,
				me: this.me,
				closable: true,
				avatarSrc: p_user.avatarSrc
			});
			this.chatContainersFromUserId[p_user.personaId] = cc;
			this.chatTabContainer.addChild(cc);

			// add listeners
			this.sendMessageHandlersFromChatContainerID[cc.id] = dojo.connect(cc, "onSendMessage", this, "_onSendMessage");

			if (this.isTerminated) {
				cc.displayMessage({ body: "Your connection to the chat server has been terminated. Please reload the page to reconnect."}, "system", false);
			}
		}

		if (this._isChatButtonHidden()){
			this._showChatButton();
		}

		// let's make sure we select the new chat before rendering it
		this.chatTabContainer.selectChild(cc);

		// if the chat is hidden, let's show it
		if (this._isHidden())
		{
			this._toggleVisibility();
		}
		// otherwise just rerender it
		else
		{
			cc.rerender();
		}

		if (this.saveOpenSessions) {
			this._saveSessionStatus(cc.userId, true);
		}

		// set focus on the textarea when we create the chat
		dijit.focus(cc.chatEntryNode);

		

		return cc;
	},
	

	// p_data should be a dictionary that maps a user's persona ID to the properties of that user. For example:
	// { "user1": {personaId: "user1", avatarUrl: "/path/to/my/avatar.png" , isOnline: true} }
	updateChatUsersData: function(p_data) {
		for (var prop in this.chatContainersFromUserId) {
			// for now, let's just update the online status. Maybe in the future we can update name/avatar as well
			var onlineStatus = (p_data[prop].isOnline) ? "Online" : "Offline";
			this.chatContainersFromUserId[prop].changeUserOnlineStatus(onlineStatus);
		}
	},

	onSendMessage: function(p_message, p_user){},
	
	/************************************
		Private Methods
	************************************/

	_onSendMessage: function(p_message, p_user){
		// forward the event on
		this.onSendMessage(p_message, p_user);
	},
	
	_toggleChatButtonIcon: function(p_isNew){
		var iconClass = (p_isNew) ? "chatBtnIconNew" : "chatBtnIcon";
		this.toggleButton.set("iconClass", iconClass);
	},
	
	_closeChild: function(p_child){
		delete this.chatContainersFromUserId[p_child.userId];
		delete this.sendMessageHandlersFromChatContainerID[p_child.id];
		
		if (this.chatTabContainer.getChildren().length < 1)
		{
			this._hide();
			this._hideChatButton();
		}

		if (this.saveOpenSessions) {
			this._saveSessionStatus(p_child.userId, false);
		}
	},
	
	_removeChatContainer: function(chatContainer){
		
	},
	
	_show: function(){
		
		this._toggleChatButtonIcon(false);
		dojo.style(this.chatTabContainerNode, "opacity", "100");
		dojo.style(this.chatTabContainerNode, "display", "block");
		
		// force rerendering the tab container and it's selected child
		var selectedItem = this.chatTabContainer.selectedChildWidget;
		this.chatTabContainer.resize();
		selectedItem.rerender();
	},
	
	_hide: function(p_useAnimation){
		dojo.fadeOut({
			node: this.chatTabContainerNode,
			duration: (p_useAnimation) ? 500 : 1,
			onEnd: dojo.hitch(this, function() {
				dojo.style(this.chatTabContainerNode, "display", "none");
			})
		}).play();
		
	},
	
	_toggleVisibility: function(){
		if (this._isHidden())
		{
			this._show();
		}
		else
		{
			this._hide(true);
		}
	},
	
	_isHidden: function(){
		return (dojo.style(this.chatTabContainerNode, "display") === "none") ? true : false;
	},
	

	_isChatButtonHidden: function() {
		return (dojo.style(this.toggleButton.domNode, "display") === "none") ? true : false;
	},

	_showChatButton: function(){
		dojo.style(this.toggleButton.domNode, "display", "block");
	},
	
	_hideChatButton: function(){
		dojo.style(this.toggleButton.domNode, "display", "none");
	},

	_saveSessionStatus: function(p_userId, p_isOpen) {
		var cc = this.chatContainersFromUserId[p_userId];
		var userData;
		if (cc) {
			userData = {
				avatarSrc: cc.avatarSrc,
				personaId: p_userId,
				fullName: cc.title
			};
		}
		// store a var that keeps track of the open chat sessions you have
		var storedSessions = window.sessionStorage.getItem("chat." + this.me + ".openSessions");
		if (!storedSessions || storedSessions.length < 1) {
			storedSessions = {};
		}
		else {
			storedSessions = dojo.fromJson(storedSessions);
		}
		if (p_isOpen) {
			storedSessions[p_userId] = userData;
		}
		else {
			delete storedSessions[p_userId];
		}
		window.sessionStorage.setItem("chat." + this.me + ".openSessions", dojo.toJson(storedSessions));
	},

	_launchSavedSessions: function() {
		var storedSessions = window.sessionStorage.getItem("chat." + this.me + ".openSessions");
		if (storedSessions && storedSessions.length > 0) {
			storedSessions = dojo.fromJson(storedSessions);
			for (var prop in storedSessions) {
				if (storedSessions[prop]) {
					this.createNewChat(storedSessions[prop]);
				}
			}
			this._hide();
		}
	}
	
});