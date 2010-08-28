/**
 * Team Discovery Channel 2010
 *
 * Sandboxed execution of Unit Tests.
 */
 
var sys = require("sys"),
    fs = require("fs"),
    jefe = new require("jefe"),
    elJefe = new jefe.Jefe(),
    jsdom = require("jsdom");
    
exports.executeTest = function( url ) {
    var document = jsdom.jsdom().createWindow();
    
    // Make the document created by jsdom work with jQuery.
    jsdom.jQueryify(document, "support/jsdom/example/jquery.js", function() {
      document.jQuery('body').append("<div class='testing'>Hello World, It works!</div>");
      sys.puts(document.jQuery(".testing").text());
      
      var javascript = fs.readFileSync("tests/index.js");

      try {
          elJefe.compile('test', javascript, { maxTime: 1000 });

          elJefe.run('test', { jQuery: document.jQuery, $: document.jQuery, document: document}, function (error, sandboxIn, sandboxOut) {
            //  sys.puts("The circumference of a circle with radius 10 is: " + sandboxOut.foobar);
          });
      } catch (e) {
          sys.print("" + e);
      }
      
    });

}