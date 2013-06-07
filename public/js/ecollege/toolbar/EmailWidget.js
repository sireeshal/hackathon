dojo.provide("ecollege.toolbar.EmailWidget");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.DropDownButton");
dojo.require("dojo.io.script");
dojo.require("dojo.cache");
dojo.require("ecollege.toolbar.Stats");

dojo.declare("ecollege.toolbar.EmailWidget", [dijit._Widget, dijit._Templated], {
	templateString: dojo.cache("ecollege.toolbar", "resources/EmailWidget.html"),
	widgetsInTemplate: true,


	baseClass: "ecollege_google_email_widget",

    constructor: function(p_options) {
        this.inherited(arguments);
    },

    postMixInProperties: function() {
        this.gmailLink = (this.domain) ? 'https://mail.google.com/a/' + this.domain : "https://mail.google.com";
    },

	postCreate: function() {
	    this.inherited(arguments);
	    var moduleUrl = dojo.moduleUrl("ecollege.toolbar.EmailWidget");
	    this.serviceUrl = (moduleUrl.scheme ? moduleUrl.scheme + "://" + moduleUrl.authority : "" ) + "/google/email/unread";
	},

	startup: function() {
	    this.inherited(arguments);

        var self = this;

        // TODO don't know the best way to do this, basically trying to get rid of the
        // arrow in the drop down button. This works for now
	    this.countNode = dojo.query(".dijitButtonContents",this.domNode)[0];
	    this.countNode.innerHTML = "";

        this.button.onClick = function() {
            self.stats.sendCounter('google.email', 1);
        };

        this.reload();
	},

  reload: function() {
      var self = this,
          targetNode =dojo.query(".ecollege_google_widget_content", this.googleDialog.domNode)[0],
          itemTemplate = dojo.cache("ecollege.toolbar.resources", "EmailItem.html"),
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
                  self.button.set('disabled',true);
              }
              else {
                  data = data && data.data;
                  var itemCount = data.items && data.items.length  || 0;

                  if(itemCount > 0) {
                      self.countNode.innerHTML = '<div class="badge_count">' + (data.fullcount < 1000 ? data.fullcount : "999+")  + '</div>';
                      for(var i=0; i < itemCount; i++) {
                          if(!data.items[i].author)
                              data.items[i].author = { name: "(no sender)", email: "" };
                          items.push( dojo.string.substitute(itemTemplate, data.items[i]) );
                      }
                      targetNode.innerHTML = items.join("");
                  }
                  else {
                    self.countNode.innerHTML = '';
                    targetNode.innerHTML = '<div style="text-align:center">No Unread Emails</div>';
                  }
              }
          },
          error: function(error) {
              targetNode.innerHTML = "An unexpected error occurred: " + error;
          }
     };
     dojo.io.script.get(jsonpArgs);
  }

});