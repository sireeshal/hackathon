dojo.provide("ecollege.toolbar.Stats");

dojo.require("ecollege.toolbar.Toolbar");

dojo.declare("ecollege.toolbar.Stats", null, {

    sendCounter: function(name) {

        var toolbar = ecollege.toolbar.Toolbar;
        var url = toolbar.data.config.root + ['/stats', 'counter', name, 1].join('/');

        var xhrArgs = {
            url: url,
            preventCache: true,
            handleAs: "json",
            callbackParamName: 'callback',
            load: function(data){
                console.log('stats successful');
            },
            error: function(error){
                console.log(error);
            }
        }

        try {
            dojo.io.script.get(xhrArgs);
        }
        catch( e ) {

        }
    }
});