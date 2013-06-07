// Provide the class
dojo.provide("ecollege.social.chat.ChatContainer");

dojo.require('dojo.date.locale');
dojo.require('dijit._Widget');
dojo.require('dijit._Templated');
dojo.require('dijit._Container');
dojo.require('dijit._Contained');
dojo.require('dijit._CssStateMixin');
dojo.require('dijit.layout.BorderContainer');
dojo.require('dijit.layout.ContentPane');


/**
	@class
	@author		maca
	
	@description
	<p>A UI element for displaying a chat conversation.</p>
*/
dojo.declare("ecollege.social.chat.ChatContainer", [dijit._Widget, dijit._Templated, dijit._Container, dijit._Contained, dijit._CssStateMixin], {
	
	/************************************
		Public Properties
	************************************/
	
	// the title maps to the user's name
	title: "",
	me: "",
	userId: "",
	templateString: dojo.cache("ecollege.social.chat","resources/ChatContainer.html"),
	widgetsInTemplate: true,
	iconClass: 'statusOnline', // Online by default
	imgPath: dojo.moduleUrl('ecollege.social.chat','images'),
	avatarSrc: "",
	maximumNumberOfMessagesInHistory: 30,
	saveMessages: true,
	loadMessageHistoryOnCreation: true,
	connectionStatus: "Online",
	
	/************************************
		Public Methods
	************************************/
	
	attributeMap: dojo.delegate(dijit._Widget.prototype.attributeMap, {
		status: {
			node: 'classmateStatusNode',
			type: 'innerHTML'
		}
	}),
	
	postCreate: function(){
		this.classmateNameNode.innerHTML = this.title;
		if (this.avatarSrc && this.avatarSrc.length > 0) {
			this.avatarNode.src = this.avatarSrc;
		}

		if (this.loadMessageHistoryOnCreation) {
			this._displaySavedMessages();
		}

	},
	
	rerender: function() {
		// call resize to re-render this widget in case any sizing calculations were done while it was hidden
		this.chatContainerNode.resize();
		this.fixScrollPos();
	},
	
	displayMessage: function(p_msg, p_from, p_saveMsg){
		var dialogNode = this.dialogNode,
			message = p_msg.body,
			chatNode, textNode;

		// If there is no body, dump out
		if (!message) { return; }
		p_msg.timeStamp = (p_msg.timeStamp) ? p_msg.timeStamp : dojo.date.locale.format(new Date(), {selector: 'time'});

		if (this.saveMessages && p_saveMsg) {
			this._saveMessage(p_msg, p_from);
		}

		// If the message doesn't have this sanitized flag,
		// we should be doing some cleaning on it to be safe.
		if (!p_msg.sanitized) { message = this._sanitizeString(message); }

		// Build up our DOM
		// First: Timestamp
		dojo.create('div', {
			className: 'timestamp',
			innerHTML: p_msg.timeStamp
		}, dialogNode);

		// Next: The dialog piece
		chatNode = dojo.create('div', {
			className: 'dialog'
		}, dialogNode);

		var chatClassName = "";
		if (p_from) {
			if (p_from == "system") {
				chatClassName = "systemChat";
			}
			else {
				chatClassName = "classmateChat";
			}
		}
		else {
			chatClassName = "myChat";
		}

		dojo.create('span', {
			className: chatClassName,
			innerHTML: (p_from ? p_from : 'me') + ': '
		}, chatNode);

		// Put the text in
		dojo.create('span', {
			innerHTML: message
		}, chatNode);

		// Scroll it down
		this.fixScrollPos();
	},
	
	handleKeys: function(e) {
		var chat = this.chatEntryNode,
			key = e.keyCode || e.charCode;

		if (key === dojo.keys.ENTER) {
			// If it's a shift key, we don't care, just let it insert.
			// Otherwise, we need to take action.
			if (!e.shiftKey && !e.ctrlKey) {
				// Stop the event from moving forward
				dojo.stopEvent(e);

				// If there's something to send, send it off, handing the event arg over
				if (chat.value !== '') {
					this.sendMessage(e);
				}
			}
		}
	},
	
	sendMessage: function(e) {
		var chat, body, msg;

		// Get our chat node
		chat = this.chatEntryNode;

		// Set up our body
		body = dojo.trim(chat.value);

		// Sanity check - make sure we actually have something to send
		if (body === '') {
			return;
		}

		// if the user is offline, don't even bother trying to send the message
		if (this.connectionStatus == "Offline") {
			this.displayMessage({body: "Unable to send message. " + this.title + " is offline."}, "system", false);
			return;
		}

		// Sanitize the body
		body = this._sanitizeString(body);

		// Set up the message to send
		msg = {
			body: body,
			sanitized: true
		};

		// Keep the buttonpress from bubbling
		dojo.stopEvent(e);

		// Display it locally
		this.displayMessage(msg, null, true);

		// Reset and refocus
		chat.value = '';
		chat.focus();
		this.onSendMessage(msg, this.userId);
	},
	
	onSendMessage: function(p_message, p_user) {},
	
	changeUserOnlineStatus: function(p_status) {
		// Our icon class for the chat has a few potential statuses
		// p_status should be "Pending", "Online", or "Offline"
		this.set('iconClass', 'status' + p_status);

		if (this.connectionStatus != p_status) {
			var statusMsg = this.title;
			if (p_status == "Online") {
				statusMsg += " is back online";
			}
			else if (p_status == "Offline") {
				statusMsg += " is no longer available";
			}
			else {
				statusMsg += " is connecting";
			}

			this.displayMessage({body: statusMsg}, "system", false);
		}

		this.connectionStatus = p_status;
	},
	
	fixScrollPos: function() {
		this.dialogNode.scrollTop = this.dialogNode.scrollHeight;
	},

	/************************************
		Private Methods
	************************************/
	
	_displaySavedMessages: function() {
		if (window.sessionStorage) {
			
			// retrieve data about the messages being sent to and received by this user
			var data = window.sessionStorage.getItem("chat." + this.me + ".users." + this.title);
			if (!data || data.length < 1) {
				return;
			}
			
			data = dojo.fromJson(data);
			dojo.forEach(data, function(item) {
				this.displayMessage(item.message, item.user, false);
			}, this);

		}
	},

	_saveMessage: function(p_message, p_user) {
		//TODO: Change document.domain to base domain so that other apps can share this data
		var messageObj = {
			message: {
				body: p_message.body,
				timeStamp: p_message.timeStamp,
				sanitized: p_message.sanitized
			},
			user: p_user
		};
		if (window.sessionStorage) {
			// store a var that keeps track of the users you are chatting with
			var storedChats = window.sessionStorage.getItem("chat.users");
			if (!storedChats || storedChats.length < 1) {
				storedChats = {};
			}
			else {
				storedChats = dojo.fromJson(storedChats);
			}
			storedChats[this.title] = true;
			window.sessionStorage.setItem("chat.users", dojo.toJson(storedChats));

			// store data about the messages being sent to and received by this user
			var data = window.sessionStorage.getItem("chat." + this.me + ".users." + this.title);
			if (!data || data.length < 1) {
				data = [];
			}
			else {
				data = dojo.fromJson(data);
			}
			while (data.length > this.maximumNumberOfMessagesInHistory) {
				data.shift();
			}
			data.push(messageObj);
			window.sessionStorage.setItem("chat." + this.me + ".users." + this.title, dojo.toJson(data));
		}
	},

	_sanitizeString: function(str) {
		// Sanitize inputs using the five known specials in XML
		str = str.replace(/&/g, '&amp;');
		str = str.replace(/</g, '&lt;');
		str = str.replace(/>/g, '&gt;');
		str = str.replace(/"/g, '&quot;');
		str = str.replace(/'/g, '&apos;');

		return str;
	}
	
	
});