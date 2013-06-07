dependencies ={
    stripConsole: "normal",

    layers:  [
        {
            name: "../ecollege/toolbar/toolbarwidgets.js",
            resourceName: "ecollege.toolbar.toolbarwidgets",
            dependencies: [
                "ecollege.toolbar.EmailWidget",
                "ecollege.toolbar.CalendarWidget",
                "ecollege.toolbar.DocsWidget",
                "ecollege.toolbar.HeaderWidget",
                "ecollege.toolbar.ProfileWidget",
                "ecollege.toolbar.WhosOnlineWidget",
                "ecollege.toolbar.Toolbar",
                "ecollege.toolbar.Utils",
                "ecollege.toolbar.Api",
                "ecollege.toolbar.Stats",
                "ecollege.toolbar.socialdata.KeepMeOnline",
                "ecollege.toolbar.socialdata.PeopleDataPoll",
                "ecollege.toolbar.socialdata.ServiceManager",
                "ecollege.social.chat.ChatContainer",
                "ecollege.social.chat.ChatDialog",
                "ecollege.social.chat.ChatManager",
                "ecollege.social.chat.ChatSession",
                "mustache._Templated"
            ]
        }
    ],

    prefixes: [
        [ "ecollege", "../../../../../../public/js/ecollege" ],
        [ "mustache", "../../../../../../public/js/mustache" ],
        [ "dijit", "../dijit" ],
        [ "dojox", "../dojox" ],
    ]

};
