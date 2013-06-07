dojo.provide("ecollege.toolbar.CalendarWidget");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.DropDownButton");
dojo.require("dojo.io.script");
dojo.require("dojo.cache");
dojo.require("dojo.date.locale");

dojo.declare("ecollege.toolbar.CalendarWidget", [dijit._Widget, dijit._Templated], {
	templateString: dojo.cache("ecollege.toolbar", "resources/CalendarWidget.html"),
	widgetsInTemplate: true,

	baseClass: "ecollege_google_calendar_widget",

    constructor: function(p_options) {
        this.inherited(arguments);
    },

    postMixInProperties: function() {
        this.calendarLink = (this.domain) ? 'https://calendar.google.com/a/' + this.domain : "https://calendar.google.com";
    },

	postCreate: function() {
	    this.inherited(arguments);
	    var moduleUrl = dojo.moduleUrl("ecollege.toolbar.CalendarWidget");
	    this.serviceUrl = (moduleUrl.scheme ? moduleUrl.scheme + "://" + moduleUrl.authority : "" ) + "/google/calendar";
	},

	startup: function() {
	    this.inherited(arguments);

        var self = this;

        // TODO don't know the best way to do this, basically trying to get rid of the
        // arrow in the drop down button. This works for now
	    this.countNode = dojo.query(".dijitButtonContents",this.domNode)[0];
	    this.countNode.innerHTML = "";

        this.button.onClick = function() {
            self.stats.sendCounter('google.calendar', 1);
        };

        this.reload();
	},

    reload: function() {
        var self = this,
            targetNode =dojo.query(".ecollege_google_widget_content", this.googleDialog.domNode)[0],
            itemTemplate = dojo.cache("ecollege.toolbar.resources", "CalendarItem.html"),
            items = [];

        //The parameters to pass to xhrGet, the url, how to handle it, and the callbacks.
        var jsonpArgs = {
            url: this.serviceUrl,
            callbackParamName: "callback",
            preventCache: true,
            content: {
                token: ecollege.toolbar.Toolbar.data.tokens.whit_access_token
            },
            load: function(data) {
                if(data.status !== "success") {
                	if (data.code == 403)
                	{   
                		targetNode.innerHTML = '<div style="text-align:center">You have not activated Google Calendar yet. Use the link below to activate it.</div>';
                        self.countNode.innerHTML = '';
                	}
                	else
                         self.button.set('disabled',true);
                }
                else {
                    data = data && data.data;

                    var itemCount = data.items && data.items.length  || 0;
                    if(itemCount > 0) {
                        self.countNode.innerHTML = '<div class="badge_count">' + (data.totalResults < 1000 ? data.totalResults : "999+")   + '</div>';
                        
                        //sort calendar events
                        data.items = data.items.sort( self._sort_by( 'start_timestamp', false, undefined ) );
                        
                        for(var i=0, len=itemCount; i < len; i++) {
                            var item = data.items[i];
                            var formattedDateTime = self._formatStartDate(item.when[0].start);
                            items.push( dojo.string.substitute(itemTemplate, { title: item.title, link: item.link, date: formattedDateTime, location: item.location || "" }) );
                        }
                        
                        targetNode.innerHTML = items.join("");
                    }
                    else {
                        targetNode.innerHTML = '<div style="text-align:center">No upcoming events in the next 7 days</div>';
                        self.countNode.innerHTML = '';
                    }
                }
            },
            error: function(error) {
                targetNode.innerHTML = "An unexpected error occurred: " + error;
            }
        };
        dojo.io.script.get(jsonpArgs);

    },
    
    _sort_by: function(field, reverse, primer){
        // This will sort a json array by any field
        // Usage example:
        // Sort by timestamp high to low
        // data.sort(_sort_by('timestamp', true, parseInt));
        //
        // Sort by title, case-insensitive, A-Z, return as upper case
        // data.sort(_sort_by('title', false, function(a){return a.toUpperCase()}));

        reverse = (reverse) ? -1 : 1;
        return function(a,b){
            a = a[field];
            b = b[field];
            if (typeof(primer) != 'undefined'){
                a = primer(a);
                b = primer(b);
            }
            if (a<b) return reverse * -1;
            if (a>b) return reverse * 1;
            return 0;
        }
    },
    
	_formatStartDate: function(isoZuluDate) {
	    var startDate = dojo.date.stamp.fromISOString(isoZuluDate)
	      , result = {};
        startDate = new Date(startDate.getTime());
        result.time = (isoZuluDate.length === 10) ? "All day" : dojo.date.locale.format(startDate, { selector: "date", datePattern: "h:mm" });
        result.ampm = (isoZuluDate.length === 10) ? "" : dojo.date.locale.format(startDate, { selector: "date", am: "AM", pm: "PM", datePattern: "a" });
        result.date = dojo.date.locale.format(startDate, { selector: "date", datePattern: "MMM d" });
        return result;
	}

});