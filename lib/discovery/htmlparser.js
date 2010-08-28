/**
 * Team Discovery Channel 2010
 *
 * Thin wrapper for node-htmlparser.js to deal with
 * problem in jsdom.
 */
  
parser = require("node-htmlparser");

// Copy parser's exports.
for (var key in parser) {
    exports[key] = parser[key];
}