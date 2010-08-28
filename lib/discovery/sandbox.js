/**
 * Team Discovery Channel 2010
 *
 * Sandboxed execution of Unit Tests.
 */
 
var sys = require("sys"),
    jefe   = new require("jefe"),  // change me as needed
    elJefe = new jefe.Jefe();

exports.executeTest = function( url ) {
    elJefe.compile("circumference", "C = 2 * Math.PI * R");

    elJefe.run("circumference", { R:10 }, function (error, sandboxIn, sandboxOut) {
        sys.puts("The circumference of a circle with radius 10 is: " + sandboxOut.C);
        process.exit(0);
    });
}