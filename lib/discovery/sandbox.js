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