// Provide the class
dojo.provide("ecollege.toolbar.socialdata.PeopleDataPoll");

// Dependencies
dojo.require("ecollege.toolbar.socialdata.ServiceManager");
dojo.require("ecollege.toolbar.Utils");
dojo.require("dojo.DeferredList");
dojo.require("dojox.timing");

/**
	@class
	@author		gregt
	
	@description
	<p>Aggregates data on all users with relation to "me" and publishes it in an event
	that anonymous consumers can subscribe to. Publishes a new event at the specified
	interval containing the same list with updated online/offline status for each user.</p>
*/
dojo.declare("ecollege.toolbar.socialdata.PeopleDataPoll", null, {
	
	/************************************
		Public Methods
	************************************/
	
	/**
		Constructor. Initialize default vars and forward the required service config hash to the serviceMgr instance.
		@param	{object}	p_serviceConfig	Required config object for the service manager. See ServiceManager class for details.
		@param	{object}	p_options	Optional config options as name/value pair:
							pollIntervalMs:{number}		Set the polling interval in milliseconds. Defaults to 60000 (one minute)
							defaultAvatarUrl:{string}	Absolute or relative URL for the default/anonymous avatar image. Defaults to "/images/anon-avatar.png"
			
		@public
	*/
	constructor: function(p_serviceConfig, p_options) {
		
		// declare private class properties
		this._serviceMgr = null;
		this._pollIntervalMs = null;
		this._defaultAvatarUrl = null;
		this._pollTimer = null;
		this._activeCoursesById = null;
		this._allUsersList = null;
		this._myUid = null;
		
		// initialize class properties
		var options = p_options || {};
		this._serviceMgr = new ecollege.toolbar.socialdata.ServiceManager(p_serviceConfig || null);
		this._defaultAvatarUrl = options.defaultAvatarUrl || dojo.moduleUrl('ecollege.toolbar.socialdata','images') + "/anon-avatar.png";
		this._pollIntervalMs = options.pollIntervalMs || 60000;
		this._pollTimer = new dojox.timing.Timer();
		this._pollTimer.setInterval(this._pollIntervalMs);
		this._pollTimer.onTick = dojo.hitch(this, this._poll);
		this._utils = new ecollege.toolbar.Utils();
		
		// subscribe to consumer messages
		this._initSubscriptions();
		
		// begin
		this._getPrimaryData();
	},
	
	/************************************
		Private Methods
	************************************/
	
	/**
		Broadcasts an event to all subscribers with the updated users data list
		@private
	*/
	_broadcastResults: function() {
		//console.log("PeopleDataPoll._broadcastResults(): " + this._allUsersList.length);
		dojo.publish("/ecollege/toolbar/socialdata/PeopleDataPoll/poll", [this._allUsersList]);
	},
	
	/**
		Broadcasts an event to all subscribers with an error message
		@private
	*/
	_broadcastError: function(p_response) {
		//console.log("PeopleDataPoll._broadcastResults()");
		dojo.publish("/ecollege/toolbar/socialdata/PeopleDataPoll/error", [p_response]);
	},
	
	/**
		Initialize subscriptions to consumer messages
		@private
	*/
	_initSubscriptions: function(p_response) {
		//console.log("PeopleDataPoll._initSubscriptions()");
		var self = this;
		
		// if the consumer publishes this event then we will immediately force a broadcast of the currently stored
		// users data back along the poll channel
		dojo.subscribe("/ecollege/toolbar/socialdata/PeopleDataPoll/resend", this, function(evtData) {
			//console.log("PeopleDataPoll: Resending latest poll data");
			if (self._allUsersList) {
				self._broadcastResults();
			}
		});
		
		// if the consumer publishes this event then we will immediately renew the complete primary datasource
		// and force a broadcast of the new users data back along the poll channel
		dojo.subscribe("/ecollege/toolbar/socialdata/PeopleDataPoll/renew", this, function(evtData) {
			//console.log("PeopleDataPoll: Renewing primary datasource");
			if (self._allUsersList) {
				self._allUsersList = null;
				self._pollTimer.stop();
				this._getPrimaryData(true);
			}
		});
	},
	
	/**
		Combines the data from course roster, persona profiles, and presence into the the primary users data source. We
		can subsequently update this primary data through polling.
		@param	{Array}		p_rosterUsers	The list of users derived from wsod course roster service
		@param	{Object}	p_profileUsers	The list of users derived from affinity group profiles service
		@param	{Object}	p_presenceUsers	The list of users derived from presence group service
		@private
	*/
	_compilePrimaryPollData: function(p_rosterUsers, p_profileUsers, p_presenceUsers) {
		//console.log("PeopleDataPoll._compilePrimaryPollData()");
		
		//console.log("p_rosterUsers = " + p_rosterUsers);
		//console.log("p_profileUsers = " + p_profileUsers);
		//console.log("p_presenceUsers = " + p_presenceUsers);
		
		var self = this;
		var profTitle = { PROF:"Instructor" };
		
		this._allUsersList = [];
		
		// Combine roster user and profile user data to create final list of users.
		dojo.forEach(p_rosterUsers, function(iRosterUser) {
			
			var profileUser = p_profileUsers[iRosterUser.personaId] || null ;
			var presenceUser = p_presenceUsers[iRosterUser.personaId] || null ;
			
			var userData = {};
			
			// roster user properties
			userData.id = userData.userId = iRosterUser.id;
			userData.personaId = iRosterUser.personaId;
			userData.firstName = iRosterUser.firstName;
			userData.lastName = iRosterUser.lastName;
			userData.roleType = iRosterUser.roleType;
			
			// supplemental properties for consumer convenience
			userData.longDisplayName = ( profTitle[iRosterUser.roleType] || iRosterUser.firstName ) + " " + iRosterUser.lastName;
			userData.shortDisplayName = self._utils.truncate(userData.longDisplayName, {maxLength:14});
			userData.sortingName = iRosterUser.lastName + ", " + iRosterUser.firstName;
			userData.isProf = profTitle[iRosterUser.roleType] ? true : false;
			userData.isMe = iRosterUser.id == self._myUid ? true : false;
			userData.longCourseList = self._parseCourseCodes(iRosterUser.courses);
			userData.shortCourseList = self._utils.truncate(userData.longCourseList, {maxLength:16});
			userData.longCourseTitleList = self._parseCourseTitles(iRosterUser.courses);
			userData.roleName = profTitle[iRosterUser.roleType] || null;
			
			userData.courses = [];
			
			dojo.forEach(iRosterUser.courses, function(iCourse) {
				userData.courses.push({id:iCourse.id,displayCourseCode:iCourse.displayCourseCode,title:iCourse.title});
			});
			
			userData.avatarUrl = self._defaultAvatarUrl;
			userData.skypeUrl = null;
			
			if (profileUser && profileUser.profileRules && profileUser.profileRules.profileIsShared) {
				
				if (profileUser.avatar) {
					var serviceCfg = self._serviceMgr.getServiceConfig();
					userData.avatarUrl = serviceCfg.baseUrl.affinityPersona + "/Affinity/v1/avatar/" + profileUser.id + "?Authorization=" + serviceCfg.tokenFunctions.getAffinityAuth() + "&f=" + profileUser.avatar;
				}
				
				if (profileUser.ims) {
					dojo.some(profileUser.ims, function(iItem) {
					
						if (iItem.provider.toLowerCase() == "skype" && iItem.username) {
							userData.skypeUrl = "skype:" + iItem.username + "?chat";
							return true;
						}
						else { return false; }
					});
				}
			}
			
			userData.isOnline = false;
			userData.showChat = false;
			userData.showSkype = false;
			
			if (presenceUser && profileUser && profileUser.profileRules && profileUser.profileRules.statusIsShared) {
				if (presenceUser.status && presenceUser.status.toLowerCase() == "online") {
					userData.isOnline = true;
					userData.showChat = true;
					if (userData.skypeUrl) userData.showSkype = true;
				}
			}
			
			self._allUsersList.push(userData);
		});
		
		this._broadcastResults();
		this._pollTimer.start();
	},
	
	/**
		Updates the list of all users with the information from the list of presence users.
		@param	{Object}	p_presenceUsers	The list of users derived from presence group service, keyed by personaId
		@private
	*/
	_compilePollData: function(p_presenceUsers) {
		//console.log("PeopleDataPoll._compilePollData()");
		
		// Iterate through all users and update each user with their presence status
		dojo.forEach(this._allUsersList, function(iUser) {
			
			var presenceUser = p_presenceUsers[iUser.personaId] || null ;
			
			// user exists, is visible, and is online
			if (presenceUser && presenceUser.status && presenceUser.status.toLowerCase() == "online") {
				iUser.isOnline = true;
				iUser.showChat = true;
				iUser.showSkype = iUser.skypeUrl ? true : false;
			}
			// we consider the user offline
			else {
				iUser.isOnline = false;
				iUser.showChat = false;
				iUser.showSkype = false;
			}
		});
		
		this._broadcastResults();
	},
	
	/**
		Kicks off the first group in a series of chained web service calls to get the primary polling data for the class. We
		only get the primary data once, on instantiation, and after that we only hit select services every time we poll,
		for example presence, and use it to update our base data.
		@private
	*/
	_getPrimaryData: function(p_flushResponseCache) {
		//console.log("PeopleDataPoll._getPrimaryData()");
		var flushResponseCache = p_flushResponseCache || false;
		this._getCourseData(flushResponseCache);
	},
	
	/**
		First group of chained webservice calls to retrieve base data. Retrieves the wsod courses and terms for the current user. 
		@private
	*/
	_getCourseData: function(p_flushResponseCache) {
		//console.log("PeopleDataPoll._getCourseData()");
		
		var getMe = this._serviceMgr.request({
			destination: this._serviceMgr.WSOD,
			verb: this._serviceMgr.GET,
			target: "/me/", // trailing slash is workaround for IE anti-cache salting bug in /me service
			flushResponseCache: p_flushResponseCache 
		});
		
		var getCourses = this._serviceMgr.request({
			destination: this._serviceMgr.WSOD,
			verb: this._serviceMgr.GET,
			target: "/me/courses",
			querystring: {"expand":"course,course.students,course.instructors"}
		});
		
		var getTerms = this._serviceMgr.request({
			destination: this._serviceMgr.WSOD,
			verb: this._serviceMgr.GET,
			target: "/me/terms"
		});
		
		var callGroup = new dojo.DeferredList([getMe, getCourses, getTerms], false, true);
		callGroup.addCallback(dojo.hitch(this, this._handleCourseDataSuccess));
		callGroup.addErrback(dojo.hitch(this, this._handlePrimaryAjaxFailure));
	},
	
	/**
		Second group of chained webservice calls to retrieve base data. Retrieves the wsod course rosters, affinity/persona
		mini-profiles, and group presence data for the user's active courses. 
		@private
	*/
	_getUserData: function() {
		//console.log("PeopleDataPoll._getUserData()");
		
		var serviceCalls = [];
		
		for (id in this._activeCoursesById) {
			
			var iCourse = this._activeCoursesById[id];
			
			var getRoster = this._serviceMgr.request({
				destination: this._serviceMgr.WSOD,
				verb: this._serviceMgr.GET,
				target: "/courses/" + iCourse.id + "/roster"
			});
			
			var getGroupProfiles = this._serviceMgr.request({
				destination: this._serviceMgr.AFFINITY_PERSONA,
				verb: this._serviceMgr.GET,
				target: "/Affinity/v1/groups/course_" + iCourse.id + "/profiles",
				querystring: {"f":"c|AI"}
			});
			
			var getGroupPresence = this._serviceMgr.request({
				destination: this._serviceMgr.AFFINITY_PRESENCE,
				verb: this._serviceMgr.GET,
				target: "/Affinity/v1/presence/groups/course_" + iCourse.id
			});
			
			serviceCalls.push(getRoster, getGroupProfiles, getGroupPresence);
		}
		
		var callGroup = new dojo.DeferredList(serviceCalls, false, true);
		callGroup.addCallback(dojo.hitch(this, this._handleUserDataSuccess));
		callGroup.addErrback(dojo.hitch(this, this._handlePrimaryAjaxFailure));
	},
	
	/**
		Makes a request to the users groups in presence to update online status of classmates.
		@public
	*/
	_poll: function() {
		//console.log("PeopleDataPoll._poll()");
		
		var serviceCalls = [];
		
		for (id in this._activeCoursesById) {
			
			var iCourse = this._activeCoursesById[id];
			
			var getGroupPresence = this._serviceMgr.request({
				destination: this._serviceMgr.AFFINITY_PRESENCE,
				verb: this._serviceMgr.GET,
				target: "/Affinity/v1/presence/groups/course_" + iCourse.id
			});
			
			serviceCalls.push(getGroupPresence);
		}
		
		var callGroup = new dojo.DeferredList(serviceCalls, false, true);
		callGroup.addCallback(dojo.hitch(this, this._handlePollSuccess));
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
		console.error("ecollege.toolbar.socialdata.PeopleDataPoll._handlePrimaryAjaxFailure()");
		
		//if (p_response && p_response.data) {
			// this error prevented us from compiling the primary data source so report it to the consumer
			this._broadcastError(p_response);
		//}
	},
	
	/**
		Handles a failure from one of the intervalled ajax calls. This error can be hidden from the consumer.
		@param	{Object}	p_response	The error information
		@private
	*/
	_handleIntervalledAjaxFailure: function(p_response) {
		console.error("ecollege.toolbar.socialdata.PeopleDataPoll._handleIntervalledAjaxFailure()");
		// This error is from an intervalled ajax call and will be retried at the next interval.
	},
	
	/**
		Handles the course and term data being returned. Uses terms to filter course list down to the active courses and kicks
		off the next group of service calls getUserData()
		@param	{Object}	p_results	The course and term data
		@private
	*/
	_handleCourseDataSuccess: function(p_results) {
		//console.log("PeopleDataPoll._handleCourseDataSuccess()");
		var self = this;
		var activeCourses = [];
		var currentDate = new Date();
		var me;
		var courses;
		var terms;
		
		// pull the courses and terms from the p_results object. The p_results object is basically an array of
		// deferred array results returned by the deferredlist.
		dojo.forEach(p_results, function(iResult) {
			if (iResult[0] == true && iResult[1].data.me) me = iResult[1].data.me;
			if (iResult[0] == true && iResult[1].data.courses) courses = iResult[1].data.courses;			
			if (iResult[0] == true && iResult[1].data.terms) terms = iResult[1].data.terms;
		});
		
		// store my uid
		this._myUid = me.id;
		
		this._activeCoursesById = {};
		
		// populate the activeCourses array with only the currently active courses
		dojo.forEach(courses, function(iCourse) {
			
			var courseTermID = self._getTermIdFromCourse(iCourse.links[0].course);
			var courseStartDate;
			var courseEndDate;
			
			// get the course's start/end dates from its associated term
			dojo.forEach(terms, function(iTerm) { // not the most efficient way to do this as there is no way to break a dojo.forEach, should use dojo.some
				if (iTerm.id == courseTermID) {
					courseStartDate = self._utils.toDate(iTerm.startDateTime);
					courseEndDate = self._utils.toDate(iTerm.endDateTime);
				}
			});
			
			// if the current time falls between the courses start/end times then push the course into the array
			if (currentDate.getTime() > courseStartDate.getTime() && currentDate.getTime() < courseEndDate.getTime()) {
				self._activeCoursesById[iCourse.links[0].course.id] = iCourse.links[0].course;
			}
		});
		
		this._getUserData();
	},
	
	/**
		Handles the course roster, persona mini-profile, and group presence data being returned. Calls the primary data compiler.
		@param	{Object}	p_results	The course roster and affinity data
		@private
	*/
	_handleUserDataSuccess: function(p_results) {
		//console.log("PeopleDataPoll._handleUserDataSuccess()");
		
		var self = this;
		var rosterResponses = []; // aggregate list of wsod course roster service call responses
		var profileResponses = []; // aggregate list of affinity group profiles service call responses
		var presenceResponses = []; // aggregate list of affinity group presence service call responses
		var rosterUsers = []; // aggregate list of unique users across all wsod rosters
		var profileUsers = {}; // aggregate list of unique users across all affinity user profiles
		var presenceUsers = {}; // aggregate list of unique users across all affinity group presence results
		
		// pull the rosters and profiles from the p_results object. The p_results object is basically an array of
		// deferred array results returned by the deferredlist.
		dojo.forEach(p_results, function(iResult) {
			if (iResult[0] == true && iResult[1].data.roster) rosterResponses.push(iResult[1]);
			else if (iResult[0] == true && iResult[1].data.length && iResult[1].data[0].profileRules) profileResponses.push(iResult[1]);
			else if (iResult[0] == true && iResult[1].data.length && iResult[1].data[0].status) presenceResponses.push(iResult[1]);
		});
		
		// aggregate roster users while filtering out duplicates
		dojo.forEach(rosterResponses, function(iRosterResponse) {
			dojo.forEach(iRosterResponse.data.roster, function(iUser) {
				// if this user is not already in the rosterUsers array then add them now
				if (dojo.every(rosterUsers, function(iRosterUser) {
					
					if (iRosterUser.id == iUser.id) {
						
						// add an additional course associated with the current roster iteration to the existing user object
						var additionalCourse = self._activeCoursesById[self._extractCourseIdFromRosterUri(iRosterResponse.url)];
						iRosterUser.courses.push(additionalCourse);
						
						// if this user is already in the rosterUsers array but their role is non-prof,
						// and we just found a new reference to the same user as a prof, then replace
						// their non-prof reference in the rosterUsers array with a prof reference. This is
						// because some profs may enroll in another course as a student but we want them
						// to always show their role as prof in the UI.						
						if (iRosterUser.roleType != "PROF" && iUser.roleType == "PROF") {
							var tempCourses = iRosterUser.courses;
							iRosterUser = dojo.clone(iUser);
							iRosterUser.courses = tempCourses;
						}
						return false;
					}
					else {
						return true;
					}
				})) {
					// add the course associated with the current roster iteration to the user object
					var userObj = dojo.clone(iUser);
					var associatedCourse = self._activeCoursesById[self._extractCourseIdFromRosterUri(iRosterResponse.url)];
					userObj.courses = [associatedCourse];
					rosterUsers.push(userObj);
				}
			});
		});
		
		// aggregate profile users while filtering out duplicates.
		dojo.forEach(profileResponses, function(iProfileResponse) {
			dojo.forEach(iProfileResponse.data, function(iUser) {
				// if this user is not already in the profileUsers hash then add them now
				if (dojo.every(profileUsers, function(iProfileUser) {
					return iProfileUser.id != iUser.id;
				})) {
					profileUsers[iUser.id] = dojo.clone(iUser);
				}
			});
		});
		
		// aggregate presence users while filtering out duplicates.
		dojo.forEach(presenceResponses, function(iPresenceResponse) {
			dojo.forEach(iPresenceResponse.data, function(iUser) {
				// if this user is not already in the presenceUsers hash then add them now
				if (dojo.every(presenceUsers, function(iPresenceUser) {
					return iPresenceUser.id != iUser.id;
				})) {
					presenceUsers[iUser.id] = iUser;
				}
			});
		});
		
		this._compilePrimaryPollData(rosterUsers, profileUsers, presenceUsers);
	},
	
	/**
		Handles the group presence data being returned.
		@param	{Object}	p_results	The affinity presence data
		@private
	*/
	_handlePollSuccess: function(p_results) {
		//console.log("PeopleDataPoll._handlePollSuccess()");
		
		if (!this._pollTimer.isRunning) return;
		
		var self = this;
		var presenceResponses = []; // aggregate list of affinity group presence service call responses
		var presenceUsers = {}; // aggregate list of unique users across all affinity group presence results
		
		// pull the group presence responses from the p_results object. The p_results object is basically an array of
		// deferred array results returned by the deferredlist.
		dojo.forEach(p_results, function(iResult) {
			if (iResult[0] == true && iResult[1].data.length && iResult[1].data[0].status) presenceResponses.push(iResult[1]);
		});
		
		// aggregate presence users while filtering out duplicates.
		dojo.forEach(presenceResponses, function(iPresenceResponse) {
			dojo.forEach(iPresenceResponse.data, function(iUser) {
				// if this user is not already in the presenceUsers hash then add them now
				if (dojo.every(presenceUsers, function(iPresenceUser) {
					return iPresenceUser.id != iUser.id;
				})) {
					presenceUsers[iUser.id] = iUser;
				}
			});
		});
		
		this._compilePollData(presenceUsers);
	},
	
	/************************************
		Helper Functions
	************************************/
	
	/**
		Returns a string which is a comma delimited list of course codes, parsed from the array of courses passed in.
		@param	{Array}		p_courses	An array of course objects. This expects each course object to have a
							property called displayCourseCode directly on the object.
		@return	{String}			The comma delimited list of course codes, as a string.
		@private
	*/
	_parseCourseCodes: function(p_courses){
		var courseCodes = "";
		
		dojo.forEach(p_courses, function(iCourse, i) {
			if (i >= 1) courseCodes += ", ";
			courseCodes += iCourse.displayCourseCode;
		});
		
		return courseCodes;
	},
	
	/**
		Returns a string which is a comma delimited list of course titles, parsed from the array of courses passed in.
		@param	{Array}		p_courses	An array of course objects. This expects each course object to have a
							property called displayCourseCode directly on the object.
		@return	{String}			The comma delimited list of course codes, as a string.
		@private
	*/
	_parseCourseTitles: function(p_courses){
		var courseTitles = "";
		
		dojo.forEach(p_courses, function(iCourse, i) {
			if (i >= 1) courseTitles += ", ";
			courseTitles += iCourse.title;
		});
		
		return courseTitles;
	},
	
	/**
		Retrieves the termid for a course by parsing through the course's links collections 
		@param	{Course}	p_course	The course object
		@return	{String}	The termid for the course.
		@private
	*/
	_getTermIdFromCourse: function(p_course){
		var termId = -1;
		var termLink = this._getTermLinkFromCourse(p_course);
		if(termLink) {
			termId = this._extractTermIdFromUri(termLink.href);
		}
		
		return termId;
	},
	
	/**
		Retrieves the link for a course's term by parsing through the course's links collections 
		@param	{Course}	p_course	The course object
		@return	{Object}	The link object for the term
		@private
	*/
	_getTermLinkFromCourse: function(p_course){
		var termLink = null;
		dojo.forEach(p_course.links, function(link){
			var test = link.rel.substring(link.rel.length - 10);
			if( test === "/rels/term") {
				termLink = link;
			}
		});
		return termLink;
	},
	
	/**
		Parses out the term id from a term's uri
		@param	{String}	p_termUri	The term's uri.  e.g. 'https://m-api.ecollege.com/terms/12345'
		@return	{String}	The id for the term
		@private
	*/
	_extractTermIdFromUri: function(p_termUri){
		var termRegex = /terms\/(\d+)/;
		var matches = termRegex.exec(p_termUri);
		if(matches.length === 2) {
			return matches[1];
		}
		
		return -1;
	},
	
	/**
		Parses out the course id from a roster uri
		@param	{String}	p_rosterUri	The roster uri.  e.g. 'https://m-api.ecollege.com/courses/123456/roster'
		@return	{String}	The id for the term
		@private
	*/
	_extractCourseIdFromRosterUri: function(p_rosterUri) {
		var termRegex = /courses\/(\d+)\/roster/;
		var matches = termRegex.exec(p_rosterUri);
		if(matches.length === 2) {
			return matches[1];
		}
		
		return -1;
	}
});
