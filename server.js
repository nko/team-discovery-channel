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

// Launch Express.
var app = express.createServer();

app.configure(function() {
    app.use(connect.conditionalGet());
    app.use(connect.gzip());
    app.use(connect.bodyDecoder());
    app.use(connect.logger());
    app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function() {
    var env = helpers.loadJSONConfiguration('local_env');
    for (var key in env) {
        if (env.hasOwnProperty(key)) {
            process.env[key] = env[key];
        }
    }
});

var db = couchdb
    .createClient(5984, 'shodan.couchone.com', process.env.COUCH_USER, process.env.COUCH_PASSWORD)
    .db('cloudq');

// Create the design document. If it already exists, it won't
// get written. You'll need to go to the database admin area
// and edit it yourself for now (sigh).
db.saveDesign('cloudq', {
    views: {
        // View function returns *strictly* tests
        "tests": {
            map: function(doc) {
                if (doc.type == 'test') {
                    emit(doc.id, doc);
                }
            }
        },
        // View function returns *strictly* test_results
        "test_results": {
            map: function(doc) {
                if (doc.type == 'test_result') {
                    emit(doc.date, doc);
                }
            }
        }
    }}, function(er, doc) {
        if (er.error != 'conflict') {
            // Conflicts are OK, for now (see above)
            throw new Error(JSON.stringify(er));
        }
    }
);

app.configure('production', function() {
    // TODO?
});

// App index
app.get('/', function(req, res) {
    res.render('view/index.ejs', {
        locals: {
            error: null,
            foo: 'Hello World'
        }
    });
});

// POST a new test record
app.post('/tests/', function(req, res) {
    if (req.body.url) {
        db.saveDoc({url: req.body.url, type: 'test'}, function(er, doc) {
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

// GET a test record
app.get('/tests/:id', function(req, res) {
    db.getDoc(req.params.id, function(er, doc) {
        res.render('view/tests/show.ejs', {
            locals: { id: req.params.id, test: doc, error: null }
        });
    });
});

// Execute test runner, then redirect to results (stored in DB)
app.post('/tests/:id/run', function(req, res) {
    db.getDoc(req.params.id, function(er, doc) {
        if (doc.url) {
            var scriptRunner = new sandbox.Sandbox({
                timeout: 10000,
                url: doc.url
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

                db.saveDoc({
                    test_id: req.params.id,
                    date: new Date(),
                    type: 'test_result',
                    output: testOutput },
                    function(er, doc) {
                        res.redirect('/tests/' + req.params.id + '/results/' + doc.id);
                    }
                );
            });
        }
    });
});

// GET a test result record
app.get('/tests/:test_id/results/:id', function(req, res) {
    db.getDoc(req.params.id, function(er, doc) {
        res.render('view/test_results/show.ejs', {
            locals: {
                test_results: doc
            }
        });
    });
});

// ??? Deprecated ???
app.get('/run-tests', function(req, res) {
    var gitPayload = helpers.loadJSONConfiguration('githook');
    var url = gitPayload.repository.url;

    if (url) {
        var scriptRunner = new sandbox.Sandbox({
            timeout: 10000,
            url: url
        });
                
        // http://github.com/nko/team-discovery-channel.
        scriptRunner.run(sandbox, function(output) {
            var error = '';

           var testOutput = [];
            try {
                var testOutput = JSON.parse(output);
            } catch (e) {
                error = 'Failed running tests.';
            }
            
            sandbox.handleBuildTweets(gitPayload, testOutput);

            res.render('view/index.ejs', {
                locals: {
                    error: null,
                    foo: 'Hello World'
                }
            });
        });
    }
});

app.post('/run-tests-twitter', function(req, res) {
    sys.puts(req.body.payload);

 /*   try {
    var gitPayload = JSON.req.body.payload;
    
    var t = new Twitter(process.env.TWITTER_USER, process.env.TWITTER_PASSWORD);

    t.update('json', {status: "Hello I CloudQ, why don't you let me run those tests for you #nodeko"}, function(result) {
         // The response is not parsed for you
         try {
             sys.puts(result);
             json = JSON.parse(result);
             sys.puts(sys.inspect(json));

         } catch(e) {
                sys.puts(e);
         }
    });
    
    } catch (Exception e) {
        
    }*/
});

var port = process.env.PORT || 8000;
app.listen(parseInt(port), null);
