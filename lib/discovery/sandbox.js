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
    http = require('http');
    

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
 * This method is called from the spawned sub-process 'run-test-process'
 * it actualy executes the qunit tests.
 */
exports.executeTest = function( url ) {
    var document = jsdom.jsdom().createWindow();
    
    // Make the document created by jsdom work with jQuery.
    jsdom.jQueryify(document, "support/jsdom/example/jquery/jquery.js", function() {
        
      // Grab a unit test and run it.
      
      //var javascript = fs.readFileSync("tests/index.js");
      var qunit = fs.readFileSync("lib/discovery/qunit.js");
      
      request('github.com', '/bcoe/jquery/raw/master/test/index.html', function( content ) {
          if ( content ) {
              
              // Prevent jQuery from executing this script or removing
              // it from the DOM.
              content = content.replace( /script/g, 'notscript' );
              
              document.jQuery('body').html(content);
              
          
              request('github.com', '/bcoe/jquery/raw/master/src/core.js', function( core ) {
              request('github.com', '/bcoe/jquery/raw/master/test/unit/core.js', function( unit ) {

                  try {

                        // Bootstram additional variables required
                        // for QUnit.
                        sandbox = {
                          window: document,
                          $: document.jQuery,
                          jQuery: document.jQuery,
                          document: document,
                          location: {
                              search: ""
                          },
                          navigator: {
                            userAgent: 'Mozilla'
                          },
                          setTimeout: function( callback, timeout ) { // Mock out setTimeout so that it works.
                              callback();
                          }
                        };

                        Script.runInNewContext(qunit + "\n" + unit, sandbox, 'myfile.js');
                        sys.puts(sandbox['data']);
                    } catch (e) {
                        sys.print("" + e);
                    }


              });
              });
          }
      });
      
    });

}

/**
 * This simply spawns off a secondary process which handles
 * the actual sandboxed JavaScript execution. This protects
 * against infinite loops.
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
        child = spawn('node', ['run-test-process.js']);
    
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