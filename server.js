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

// NPM Bundle
require('./vendor');
var connect = require('connect');
var couchdb = require('couchdb');

var db = couchdb.createClient(5984, 'shodan.couchone.com').db('tests');

// Launch Express.
var app = express.createServer();

app.configure(function() {
    app.use(connect.conditionalGet());
    app.use(connect.gzip());
    app.use(connect.bodyDecoder());
    app.use(connect.logger());
    app.use(express.staticProvider(__dirname + '/public'));
});

// Index.
app.get('/', function(req, res) {
    res.render('view/index.ejs', {
        locals: {
            error: null,
            foo: 'Hello World'
        }
    });
});

app.post('/tests/', function(req, res) {
    if (req.body.url) {
        db.saveDoc({url: req.body.url}, function(er, doc) {
            if (er) {
                throw new Error(JSON.stringify(er));
            }
            sys.puts('Successfully wrote record ' + doc.id + ' to CouchDB.');
            res.redirect('/tests/' + doc.id);
        });
    } else {
        res.render('view/index.ejs', {
            locals: {
                'error': 'Please provide a URL.'
            }
        });
    }
});

app.get('/tests/:id', function(req, res) {
    db.getDoc(req.params.id, function(er, doc) {
        sys.log(doc);
        res.render('view/tests/show.ejs', {
            locals: { id: req.params.id, test: doc }
        });
    });
});

// Unit-Testing endpoint.
app.post('/run-tests', function(req, res) {
    if (req.body.url) {
        var scriptRunner = new sandbox.Sandbox({
            timeout: 10000,
            url: req.body.url
        });
         
        // http://github.com/nko/team-discovery-channel.
        scriptRunner.run(sandbox, function(output) {
            var error = '';
           
           var testOutput = [];
            try {
                var testOutput = JSON.parse(output);
            } catch (e) {
                error = 'Failed running tests.'
            }
            
            res.render('view/run-tests.ejs', {
                locals: {
                    'error': error,
                    'testOutput': testOutput,
                    'url': req.body.url
                }
            });
        });        
    }
});

app.get('/run-tests', function(req, res) {
    res.render('view/run-tests.ejs', {
        locals: {
            'error': '',
            'testOutput': '',
            'url': ''
        }
    }); 
});

var port = process.env.PORT || 8000;
app.listen(parseInt(port), null);
