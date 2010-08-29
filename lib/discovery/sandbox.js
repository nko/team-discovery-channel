/**
 * Team Discovery Channel 2010
 *
 * Sandboxed execution of Unit Tests.
 */
 
var sys = require("sys"),
    fs = require("fs"),
    Script = process.binding('evals').Script
    jsdom = require("jsdom"),
    spawn = require('child_process').spawn,
    connect = require('connect'),
    express = require('express'),
    http = require('http'),
    browser = require('jsdom/browser'),
    Twitter = require('evented-twitter').Twitter;

/**
 * Grab the HTML contents of a test asset.
 *
 * @param {String} host
 * @param {String} path
 * @param {Function} callback
 * @return void
 */
function request(host, path, callback){
    var client = http.createClient(80, host),
        req = client.request('GET', path, { Host: host });
    req.addListener('response', function(res){
        res.body = '';
        res.addListener('data', function(chunk){ res.body += chunk; });
        res.addListener('end', function(){
            try {
                callback(res.body);
            } catch (err) {
                callback(false);
            }
        });
    });
    req.end();
}

/**
 * Pulled in an URI parsing library so that we can easily pull
 * in remote resources.
 */

 // parseUri 1.2.2
 // (c) Steven Levithan <stevenlevithan.com>
 // MIT License

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

    
/**
 * Given a sandbox object add additional dependencies
 * required for qunit tests to run smoothly.
 *
 * @param {object} sandbox
 * @return void
 */
function getSandbox( document ) {
        
    var sandbox = {
      window: document,
      $: document.jQuery,
      jQuery: document.jQuery,
      document: document.document,
      location: {
          search: ""
      },
      navigator: {
        userAgent: 'Mozilla'
      },
      setTimeout: function( callback, timeout ) { // Mock out setTimeout so that it works.
          callback();
      },
      q: document.jQuery
    };
    
    return sandbox;
}
    
/**
 * This method is called from the spawned sub-process 'run-test-process'
 * it actualy executes the qunit tests.
 *
 * @param {string} url the location of the unit tests to run. index.html is expected.
 */
exports.executeTest = function( url ) {
    // First parse the URL so that we can perform a request.
    var parsedUrl = parseUri( url );
    var testPath = "/raw/master/test/"; // Where should we search for qunit tests.
    var testFile = "index.html";

    var document = jsdom.jsdom().createWindow();

    // Make the document created by jsdom work with jQuery.
    jsdom.jQueryify(document, "support/jsdom/example/jquery/jquery.js", function() {
        
        //var javascript = fs.readFileSync("tests/index.js");
        var qunit = fs.readFileSync("lib/discovery/qunit.js");
        
        request(parsedUrl.host, parsedUrl.path + testPath + testFile, function( content ) {
                    
            if ( content ) {

                // Output the content to the DOM so that we can test against it.
                document.jQuery('body')[0].innerHTML = content;
                
                // A Callback that is executed once all the script assets are loaded.
                var scriptCount = document.jQuery('script').length;
                var scriptLoadCount = 0;
                var scriptContent = "";
                var scriptCallback = function(content) {
                    scriptLoadCount += 1;
                    scriptContent += content;

                    // We've loaded in all the scripts.
                    if (scriptLoadCount == scriptCount) {
                        var sandbox = getSandbox( document );
                        Script.runInNewContext(qunit + "\n" + scriptContent, sandbox, 'myfile.js');
                        sys.puts(JSON.stringify(sandbox['data']));
                    }
                }
                                
                document.jQuery('script').each( function() {
                    var script = document.jQuery(this);
                    var scriptFile = script.attr('src');
                    
                    request(parsedUrl.host, parsedUrl.path + testPath + scriptFile, scriptCallback);
                });
            }
        });
    });
}

/**
 * This simply spawns off a secondary process which handles
 * the actual sandboxed JavaScript execution. This protects
 * against infinite loops.
 *
 * @param {object} options 
 * @return void
 */
function Sandbox( options ) {
  this.options = options;
  
  this.run = function(code, hollaback) {
    // Any vars in da house?
    var timer,
        stdout = "",
        output = function(data) {
          if (!!data) stdout += data;
        },
        child = spawn('node', ['run-test-process.js', options.url]);
    
    // Listen
    child.stdout.addListener("data", output);
    child.addListener("exit", function(code) {
      clearTimeout(timer);
      hollaback.call(this, stdout);
    });
    
    timer = setTimeout(function() {
      child.stdout.removeListener("output", output);
      stdout = "TimeoutError";
      child.kill();
    }, this.options.timeout);
  };
}

exports.Sandbox = Sandbox;

/**
 * We need to be able to shorten the check-in URLs.
 */
exports.bitly = function( url, callback ) {	
    request('api.bit.ly', '/v3/shorten?format=json&longUrl=' + url + '&apiKey=' + process.env.BITLY_KEY + '&login=' + process.env.BITLY_USER , function( content ) {
        try {
            var payload = JSON.parse(content);
            callback(payload.data.url);
        } catch (e) {
            
        }
    });
}

/**
 * Handle the twitter messaging that occurs when a build
 * fails.
 */
exports.handleBuildTweets = function(gitPayload, buildPayload, twitter) {
    
    var fail = false;
    for (var i = 0, module; (module = buildPayload[i]); i++) {
        for (var ii = 0, test; (test = module.tests[ii]); ii++) {
            if (!test.result) {
                fail = true;
                break;
            }
        }
        
        if (fail) {
            break;
        }
    }
    
    // Did the build fail, damn!
    if (fail) {
        
        // Get the URL of the revision that might have broken the build.
        exports.bitly( gitPayload.commits[0].url, function( shortUrl ) {
            
            var t = new Twitter(process.env.TWITTER_USER, process.env.TWITTER_PASSWORD);
            sys.puts(process.env.TWITTER_USER);
            sys.puts(process.env.TWITTER_PASSWORD);

            t.update('json', {status: "Hey " + twitter + " you broke the build! " + shortUrl + " #nodeko"}, function(result) {
                 // The response is not parsed for you
                 try {

                     json = JSON.parse(result);
                     sys.puts(sys.inspect(json));

                 } catch(e) {
                        sys.puts(e);
                 }
            });

        });
    
    }
}