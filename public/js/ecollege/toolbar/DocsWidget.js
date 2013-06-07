dojo.provide("ecollege.toolbar.DocsWidget");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.DropDownButton");
dojo.require("dojo.io.script");
dojo.require("dojo.cache");

dojo.declare("ecollege.toolbar.DocsWidget", [dijit._Widget, dijit._Templated], {
	templateString: dojo.cache("ecollege.toolbar", "resources/DocsWidget.html"),
	widgetsInTemplate: true,

	baseClass: "ecollege_google_docs_widget",

    constructor: function(p_options) {
        this.inherited(arguments);
    },

    postMixInProperties: function() {
        this.docsLink = ( this.domain ) ? 'https://docs.google.com/a/' + this.domain : "https://docs.google.com";
    },

	postCreate: function() {
	    this.inherited(arguments);
	    var moduleUrl = dojo.moduleUrl("ecollege.toolbar.DocsWidget");
	    this.serviceUrl = (moduleUrl.scheme ? moduleUrl.scheme + "://" + moduleUrl.authority : "" ) + "/google/docs";
	},

	startup: function() {
        this.inherited(arguments);

        var self = this;
        // TODO don't know the best way to do this, basically trying to get rid of the
        // arrow in the drop down button. This works for now
        this.countNode = dojo.query(".dijitButtonContents",this.domNode)[0];
        this.countNode.innerHTML = "";

        this.button.onClick = function() {
            self.stats.sendCounter('google.docs', 1);
        };

        this.reload();
	},

  reload: function() {
      var self = this;
      var targetNode =dojo.query(".ecollege_google_widget_content", this.googleDialog.domNode)[0];
      var itemTemplate = dojo.cache("ecollege.toolbar.resources", "DocsItem.html");
      var items = [];

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
                    self.button.set('disabled',true);
                }
                else {
                    data = data && data.data;
                    var itemCount = data.items && data.items.length  || 0,
                        unreadCount = 0;

                    if(itemCount > 0) {
                        for(var i=0; i < itemCount; i++) {
                            var item = data.items[i];
                            item.type = self._expectedDocTypes[ item.type ] || "document";
                            item.updated = self._formatDate(item.updated);
                            item.doc_unread_class = (item.unread && ++unreadCount) ? "google_doc_unread" : "";
                            items.push( dojo.string.substitute(itemTemplate, item) );
                        }
                        targetNode.innerHTML = items.join("");
                        if(unreadCount > 0)
                          self.countNode.innerHTML = '<div class="badge_count">' + (itemCount < 1000 ? unreadCount : "999+")  + '</div>';
                    }
                    else {
                        targetNode.innerHTML = '<div style="text-align:center">No Documents Found</div>';
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

	_getDocType: function(entry) {

	    for(var i=0, l=entry.category.length; i<l; i++) {
	        var item = entry.category[i];
	        if(item.scheme == "http://schemas.google.com/g/2005#kind")
	            return item.label;
	    }
	    // default to document
	    return "document";
	},

	_expectedDocTypes : {
	    "document":"document",
	    "spreadsheet":"spreadsheet",
	    "presentation":"presentation",
	    "pdf":"pdf",
	    "form":"form",
	    "video":"video",
	    "drawing":"drawing",
	    "video/mp4":"video",
	    "image/jpeg":"image",
	    "image/png":"image"
	},

	_formatDate: function(isoZuluDate) {
	    var date = dojo.date.stamp.fromISOString(isoZuluDate);
        date = new Date(date.getTime());
        return dojo.date.locale.format(date, { selector: "date", am: "am", pm: "pm", datePattern: "MM/dd/yyyy hh:mma" });
	}


});