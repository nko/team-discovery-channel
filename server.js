/**
 * Team Discovery Channel 2010
 *
 * Our contest entry for the 2010 Knode-Knock-Out competition. We're
 * probably going to be doing something involving WebHooks/Unit Testing.
 */

require.paths.unshift('lib/discovery');

var sys = require('sys');
var helpers = require('helpers');

// Load in paths that should be search when running
// require. Makes our lives easier when dealing with 3rd
// party libraries.
var paths = helpers.loadJSONConfiguration('paths');

for ( var i = 0, path; ( path = paths[i] ) != null; i++ ) {
    require.paths.unshift(path);
}


// Setup the express routes. Start with '/' for testing.
var express = require('express');
var app = express.createServer();

// Launch Express.
app.listen(parseInt(process.env.PORT || 8000), null);

// The actual endpoints.
app.get('/', function(req, res) {
    res.render('view/index.ejs', {
        locals: {
            foo: 'Hello World'
        }
    }) ;
})