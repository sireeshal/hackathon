// simple proxy module for take a request and reproxying to the base URL instead.
module.exports = function(base, req, res) {
    var url = base + req.url
      , parsed = require('url').parse(url)
      , proxyhost = parsed.host
      , proxyport = parsed.port || ((parsed.protocol === "https") ? 443 : 80)
      , proxyPath = parsed.pathname + (parsed.search || "")
      , agent = ((parsed.protocol === "https") ? require('https') : require('http'))
      , proxyOptions = {host:proxyhost, port: proxyport, path: proxyPath, method: req.method, headers: req.headers};

    proxyOptions.headers.host = proxyhost + ":" + proxyport;
    
    var proxyRequest = agent.request(proxyOptions, function(proxyResponse) {

      proxyResponse.on('data', function(chunk) {
          res.write(chunk, 'binary');
      });
      
      proxyResponse.on('end', function() {
          res.end();
      });
      
      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      
    });
   
    proxyRequest.on('error', function(e) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(e.message);
        res.end();
    });
    
    req.addListener('data', function(chunk) {
        proxyRequest.write(chunk, 'binary');
    });
    
    req.addListener('end', function() {
        proxyRequest.end();
    });  
}
