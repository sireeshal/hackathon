var assert = require('assert')
  , querystring = require('querystring')
  , http = require('http')
  , util = require('util');

///////////////////////////////////////////////////////////////////////////////
// Test basic config
///////////////////////////////////////////////////////////////////////////////
exports['test config'] = function() {
    var googleEmail = require('./../lib/googleEmail.js');
    var exceptionCaught = false;
    try {
        console.log("ERROR in console expected");
        googleEmail.unreadFeed("test@test.com", function() {});
    }
    catch(e) {
        exceptionCaught = true;
    }
    assert.ok(exceptionCaught);

    // reset exceptionCaught
    exceptionCaught = false;

    // intitialize with key and secret
    googleEmail.init("key", "secret");
    
    try {
        googleEmail.unreadFeed("test@test.com", function() {});
    }
    catch(e) {
        exceptionCaught = true;
    }
    
    // this time no exception should have been thrown
    assert.ok(!exceptionCaught);
};

///////////////////////////////////////////////////////////////////////////////
// Test email service URL override
///////////////////////////////////////////////////////////////////////////////
exports['test URL override'] = function() {
    var googleEmail = require('./../lib/googleEmail.js');
    var port = 19901;
    googleEmail.GOOGLE_NEW_EMAIL_FEED_URL = "http://localhost:" + port + "?email={{email}}";
    
    assert.equal("http://localhost:" + port + "?email=test%40test.com", googleEmail.getEmailFeelUrl("test@test.com"));
};


exports['test mocked feed request'] = function() {
    var expectedAssertions = 3;
    var assertionsCalled = 0;
    
    var googleEmail = require('./../lib/googleEmail.js');
    var port = 19901;
    googleEmail.GOOGLE_NEW_EMAIL_FEED_URL = "http://localhost:" + port + "/feed/?email={{email}}";

    var server = require('http').createServer(function (req, res) {
        assert.equal("GET", req.method);
        assert.equal(req.url, "/feed/?email=test%40test.com");
        res.writeHead(200, {'Content-Type': 'application/json'});
        
        // Big static copy of a JSON response #####################################################################################
        var mockedResponseJSON = { 
          '@': { version: '0.3', xmlns: 'http://purl.org/atom/ns#' },
          title: 'Gmail - Inbox for mike@testedu.info',
          tagline: 'New messages in your Gmail Inbox',
          fullcount: '3',
          link: 
           { '@': 
              { rel: 'alternate',
                href: 'http://mail.google.com/mail',
                type: 'text/html' } },
          modified: '2011-04-18T21:20:27Z',
          entry: 
           [ { title: 'Customize Gmail with colors and themes',
               summary: 'To spice up your inbox with colors and themes, check out the Themes tab under Settings. Customize ...',
               link: 
                { '@': 
                   { rel: 'alternate',
                     href: 'http://mail.google.com/mail?account_id=mike@testedu.info&message_id=12edf8cc5ab459f3&view=conv&extsrc=atom',
                     type: 'text/html' } },
               modified: '2011-03-22T21:51:08Z',
               issued: '2011-03-22T21:51:08Z',
               id: 'tag:gmail.google.com,2004:1364019818741914099',
               author: 
                { name: 'Gmail Team',
                  email: 'mail-noreply@google.com' }
               },
             { title: 'Get Gmail on your mobile phone',
               summary: 'Access Gmail on your mobile phone The days of needing your computer to get to your inbox are long ...',
               link: 
                { '@': 
                   { rel: 'alternate',
                     href: 'http://mail.google.com/mail?account_id=mike@testedu.info&message_id=12edf8cc5a9560b9&view=conv&extsrc=atom',
                     type: 'text/html' } },
               modified: '2011-03-22T21:51:07Z',
               issued: '2011-03-22T21:51:07Z',
               id: 'tag:gmail.google.com,2004:1364019818739884217',
               author: 
                { name: 'Gmail Team',
                  email: 'mail-noreply@google.com' }
                },
             { title: 'Get started with Gmail',
               summary: '4 things you need to know Gmail is a little bit different. Learn these 4 basics and you\'ll ...',
               link: 
                { '@': 
                   { rel: 'alternate',
                     href: 'http://mail.google.com/mail?account_id=mike@testedu.info&message_id=12edf8cc3652e8d8&view=conv&extsrc=atom',
                     type: 'text/html' } },
               modified: '2011-03-22T21:51:07Z',
               issued: '2011-03-22T21:51:07Z',
               id: 'tag:gmail.google.com,2004:1364019818131548376',
               author: 
                { name: 'Gmail Team',
                  email: 'mail-noreply@google.com' }
                } ] };
        // #######################################################################################################################        
        
        res.end(JSON.stringify(mockedResponseJSON));
    });
    
    var timeout = undefined; 
    
    var finish = function() {
        server.close();
        clearTimeout(timeout);
        assert.equal(expectedAssertions, 1);
        console.log("****************************************************************");
    }
    
    server.listen(port, "localhost", function() {
        googleEmail.unreadFeed("test@test.com", function(error, result) {
            assert.ok(!error);
            assertionsCalled++;

            assert.equal(3, result.entry.length);
            assertionsCalled++;

            assert.ok(result.entry[0].prettyDate);
            assertionsCalled++;

            finish();
        });   
        
        timeout = setTimeout(function() {
                server.close();
            }, 2000);     
    });
    

};



