/**
 * Team Discovery Channel 2010
 *
 * Sandboxed execution of Unit Tests.
 */
 
var sys = require("sys"),
    fs = require("fs"),
    Script = process.binding('evals').Script
    jsdom = require("jsdom");
    
exports.executeTest = function( url ) {
    var document = jsdom.jsdom().createWindow();
    
    // Make the document created by jsdom work with jQuery.
    jsdom.jQueryify(document, "support/jsdom/example/jquery/jquery.js", function() {
      
      var javascript = fs.readFileSync("tests/index.js");

      try {
          sandbox = {
            $: document.jQuery,
            jQuery: document.jQuery
          };
          
          Script.runInNewContext(javascript, sandbox, 'myfile.js');
          sys.puts(sys.inspect(sandbox));
      } catch (e) {
          sys.print("" + e);
      }
      
    });

}

// sandbox.js - Rudimentary JS sandbox
// Gianni Chiappetta - gf3.ca - 2010

/*------------------------- INIT -------------------------*/
var sys = require("sys")
  , spawn = require('child_process').spawn;

/*------------------------- Sandbox -------------------------*/
function Sandbox(options) {
  this.options = Sandbox.options;
  
  this.run = function(code, hollaback) {
    // Any vars in da house?
    var timer,
        stdout = "",
        output = function(data) {
          if (!!data) stdout += data;
        },
        child = spawn(this.options.node, ['test-process.js']);
        sys.puts(this.options.shovel);
    
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

// Options
Sandbox.options = {
  timeout: 500,
  node: "node",
  shovel: (function() {
    var p = __filename.split("/").slice(0, -1);
    p.push("shovel.js");
    return p.join("/");
  })()
};

/*------------------------- Export -------------------------*/
exports.Sandbox = Sandbox;

