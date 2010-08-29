/**
 * Team Discovery Channel 2010
 *
 * Our contest entry for the 2010 Knode-Knock-Out competition. We're
 * probably going to be doing something involving WebHooks/Unit Testing.
 */

require.paths.unshift('lib/discovery');

var sys = require('sys');
var helpers = require('helpers');
var crypto = require('crypto');

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
require(__dirname + '/vendor');
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
                    emit(doc.date, doc);
                }
            }
        },
        // View function returns *strictly* test_results
        "test_results": {
            map: function(doc) {
                if (doc.type == 'test_result') {
                    emit([doc.test_id, doc.date], doc);
                }
            }
        }
    }}, function(er, doc) {
        if (er && er.error != 'conflict') {
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
    // Again, don't know why the view helper is failing me
    db.request('/_design/cloudq/_view/tests', function(er, result) {
        res.render('view/index.ejs', {
            locals: {
                error: null,
                tests: result.rows,
                url: '', // http://github.com/nko/team-discovery-channel
            }
        });
    });
});

// POST a new test record
app.post('/tests/', function(req, res) {
    var urlRegex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    if (req.body.url && urlRegex.test(req.body.url)) {

        var id = crypto.createHash('md5').update(req.body.url).digest('hex');
        db.saveDoc(id, {url: req.body.url, type: 'test', date: new Date() }, function(er, doc) {

            // Asynchronously run tests
            runTests(id, req.body.url);
            res.redirect( '/tests/' + id );
        });
    } else {
        res.render('view/index.ejs', {
            locals: {
                'error': 'Please provide a URL.',
                url: req.body.url,
                tests: [] // NEED TO FIX THIS
            }
        });
    }
});

function runTests(test_id, url, callback) {
    if (!url) {
        return;
    }

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
            error = 'Failed running tests.'
        }
        var total = 0, passed = 0;
        for (var i = 0; i < testOutput.length; i++) {
            tests = testOutput[i].tests;
            for (var j = 0; j < tests.length; j++) {
                passed += tests[j].result;
                total++;
            }
        }

        db.saveDoc({
            test_id: test_id,
            date: new Date(),
            total: total,
            passed: passed,
            type: 'test_result',
            output: testOutput },
            callback
        );
    });
}

function ISODateString(d){
 function pad(n){return n<10 ? '0'+n : n}
 return d.getUTCFullYear()+'-'
      + pad(d.getUTCMonth()+1)+'-'
      + pad(d.getUTCDate())+'T'
      + pad(d.getUTCHours())+':'
      + pad(d.getUTCMinutes())+':'
      + pad(d.getUTCSeconds())+'Z'}

// GET a test record
app.get('/tests/:id', function(req, res) {
    db.getDoc(req.params.id, function(er, test) {
        // Mangling together this url myself, because I couldn't get node-couchdb
        // to like these queries

        // HACK: Sort keys by [test_id, start of unix datetime] to [test_id, current time]
        var startkey = '["' + req.params.id + '","' + ISODateString(new Date()) + '"]';
        var endkey = '["' + req.params.id + '","' + ISODateString(new Date(0)) + '"]';
        var url = '/_design/cloudq/_view/test_results?startkey=' + encodeURIComponent(startkey) + '&endkey=' + encodeURIComponent(endkey) + '&descending=true&limit=5';
        db.request(url, function(er, testResults) {
            res.render('view/tests/show.ejs', {
                locals: { id: req.params.id, test: test, error: null, test_results: testResults }
            });

        })
    });
});

// Execute test runner, then redirect to results (stored in DB)
app.post('/tests/:id/run', function(req, res) {
    db.getDoc(req.params.id, function(er, doc) {
        runTests(doc.id, doc.url, function(er, testResults) {
            res.redirect('/tests/' + req.params.id + '/results/' + testResults.id);
        });
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

app.post('/hooks/github/:twitter', function(req, res) {

    try {
        var gitPayload = JSON.parse(req.body.payload);
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

                sandbox.handleBuildTweets(gitPayload, testOutput, req.params.twitter);

                res.render('view/index.ejs', {
                    locals: {
                        error: null,
                        foo: 'Hello World'
                    }
                });
            });
        }
    } catch (e) {
        sys.puts(e);
    }

});

var port = process.env.PORT || 8000;
app.listen(parseInt(port), null);
