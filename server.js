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

var express = require('express');
var sandbox = require('sandbox');

// Launch Express.
var app = express.createServer();

app.configure(function(){
    app.use(express.staticProvider(__dirname + '/public'));
});

// Index.
app.get('/', function(req, res) {
    res.render('view/index.ejs', {
        locals: {
            foo: 'Hello World'
        }
    });
});

app.post('/tests/', function(req, res) {
  res.render('view/tests/show.html.ejs', {
  });
});

// Unit-Testing endpoint.
app.get('/test', function(requ, res) {
    sandbox.executeTest( 'www.google.com' );

    res.render('view/index.ejs', {
        locals: {
            foo: 'Hello World'
        }
    });
});

var port = process.env.PORT || 8000;
app.listen(parseInt(port), null);
console.log('node server listening on ' + port);