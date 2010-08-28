/**
 * Team Discovery Channel 2010
 *
 * Sandboxed execution of Unit Tests.
 */
 
var sys = require("sys"),
    jefe = new require("jefe"),
    elJefe = new jefe.Jefe(),
    jsdom = require("jsdom");
    
exports.executeTest = function( url ) {
    var document = jsdom.jsdom().createWindow();
    
    // Make the document created by jsdom work with jQuery.
    jsdom.jQueryify(document, "support/jquery.js", function() {
      document.jQuery('body').append("<div class='testing'>Hello World, It works!</div>");
      sys.puts(document.jQuery(".testing").text());
      
      
      elJefe.compile("circumference", "C = 2 * Math.PI * R");

      elJefe.run("circumference", { R:10 }, function (error, sandboxIn, sandboxOut) {
          sys.puts("The circumference of a circle with radius 10 is: " + sandboxOut.C);
      });
      
    });

}