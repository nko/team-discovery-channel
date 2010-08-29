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
var fs = require('fs');

// Load in paths that should be search when running
// require. Makes our lives easier when dealing with 3rd
// party libraries.
var paths = helpers.loadJSONConfiguration('paths');

for ( var i = 0, path; ( path = paths[i] ) != null; i++ ) {
    require.paths.unshift(path);
}

var express = require('express');
var ejs = require('ejs');
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
    .db(process.env.COUCH_DB);

// Save the design document to the Couch server. If the
// document already exists, it will update it.
db.getDoc('_design/cloudq', function(er, doc) {
    var params = { views: {
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
    }};

    if (doc) {
        // Need to pass rev to avoid doc conflicts
        params._rev = doc._rev;
    }

    db.saveDoc('_design/cloudq', params, function(er, doc) {
        if (er) {
            throw new Error(JSON.stringify(er));
        }
        sys.log("CouchDB design document updated");
    });
});

/*
 * JavaScript Pretty Date
 * Copyright (c) 2008 John Resig (jquery.com)
 * Licensed under the MIT license.
 */

app.configure('production', function() {
    // TODO?
});

// App index
app.get('/', function(req, res) {
    // Again, don't know why the view helper is failing me
    db.request('/_design/cloudq/_view/test_results?descending=true&limit=10', function(er, result) {
        res.render('view/index.ejs', {
            locals: {
                test_results: result.rows,
                url: '', // http://github.com/nko/team-discovery-channel
            }
        });
    });
});

// POST a new test record
var testStates = {};
app.post('/tests/', function(req, res) {
    var urlRegex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    if (req.body.url && urlRegex.test(req.body.url)) {

        var id = crypto.createHash('md5').update(req.body.url).digest('hex');
        db.saveDoc(id, {url: req.body.url, type: 'test', date: new Date() }, function(er, doc) {

            // Asynchronously run tests
            testStates[id] = {};
            testStates[id].status = "running";
            runTests(id, req.body.url, function( data ) {
                try {
                    var body = ''+fs.readFileSync("views/_test-result.ejs");
                    var content = ejs.render(body, {
                        locals: {
                            results: data
                        }
                    });
                    testStates[id].content = content;
                    testStates[id].status = "complete";
                } catch (e) {
                    sys.puts(e);
                }
            });

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

/**
 * Check whether tests are currently running for a given
 * id.
 */
app.get('/tests/running/:id', function(req, res) {
    if (testStates[req.params.id]) {
        res.send(JSON.stringify(testStates[req.params.id]));
    } else {
        res.send(JSON.stringify({status: 'unknown'}))
    }
});

function runTests(test_id, url, callback, twitter, gitPayload) {
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

        if (twitter) {
            sandbox.handleBuildTweets(gitPayload, testOutput, twitter);
        }

        db.saveDoc({
            test_id: test_id,
            date: new Date(),
            total: total,
            passed: passed,
            url: url,
            type: 'test_result',
            output: testOutput },
            
            callback ({
                test_id: test_id,
                date: new Date(),
                total: total,
                passed: passed,
                url: url,
                type: 'test_result',
                output: testOutput
            })
        );
    });
}

/*
 * Javascript Humane Dates
 * Copyright (c) 2008 Dean Landolt (deanlandolt.com)
 * Re-write by Zach Leatherman (zachleat.com)
 *
 * Adopted from the John Resig's pretty.js
 * at http://ejohn.org/blog/javascript-pretty-date
 * and henrah's proposed modification
 * at http://ejohn.org/blog/javascript-pretty-date/#comment-297458
 *
 * Licensed under the MIT license.
 */
// http://www.zachleat.com/Lib/jquery/humane.js
function prettyDate(date_str){
    var time_formats = [
        [60, 'Just Now'],
        [90, '1 Minute'], // 60*1.5
        [3600, 'Minutes', 60], // 60*60, 60
        [5400, '1 Hour'], // 60*60*1.5
        [86400, 'Hours', 3600], // 60*60*24, 60*60
        [129600, '1 Day'], // 60*60*24*1.5
        [604800, 'Days', 86400], // 60*60*24*7, 60*60*24
        [907200, '1 Week'], // 60*60*24*7*1.5
        [2628000, 'Weeks', 604800], // 60*60*24*(365/12), 60*60*24*7
        [3942000, '1 Month'], // 60*60*24*(365/12)*1.5
        [31536000, 'Months', 2628000], // 60*60*24*365, 60*60*24*(365/12)
        [47304000, '1 Year'], // 60*60*24*365*1.5
        [3153600000, 'Years', 31536000], // 60*60*24*365*100, 60*60*24*365
        [4730400000, '1 Century'], // 60*60*24*365*100*1.5
    ];

    var time = ('' + date_str).replace(/-/g,"/").replace(/[TZ]/g," "),
        dt = new Date,
        seconds = ((dt - new Date(time) + (dt.getTimezoneOffset() * 60000)) / 1000),
        token = ' Ago',
        i = 0,
        format;

    if (seconds < 0) {
        seconds = Math.abs(seconds);
        token = '';
    }

    while (format = time_formats[i++]) {
        if (seconds < format[0]) {
            if (format.length == 2) {
                return format[1] + (i > 1 ? token : ''); // Conditional so we don't return Just Now Ago
            } else {
                return Math.round(seconds / format[2]) + ' ' + format[1] + (i > 1 ? token : '');
            }
        }
    }

    // overflow for centuries
    if(seconds > 4730400000)
        return Math.round(seconds / 4730400000) + ' Centuries' + token;

    return date_str;
};


function ISODateString(d){
 function pad(n){return n<10 ? '0'+n : n}
 return d.getUTCFullYear()+'-'
      + pad(d.getUTCMonth()+1)+'-'
      + pad(d.getUTCDate())+'T'
      + pad(d.getUTCHours())+':'
      + pad(d.getUTCMinutes())+':'
      + pad(d.getUTCSeconds())+'Z'}

function prettyUrl(url) {
    return (url || '').replace(/^(http)s?:\/+(github\.com\/)?/i, '');
}

// GET a test record
app.get('/tests/:id', function(req, res) {
    db.getDoc(req.params.id, function(er, test) {
        // Mangling together this url myself, because I couldn't get node-couchdb
        // to like these queries

        // HACK: Sort keys by [test_id, start of unix datetime] to [test_id, current time]
        var startkey = '["' + req.params.id + '","2020-12-31T24:59:59Z"]';
        var endkey = '["' + req.params.id + '","' + ISODateString(new Date(0)) + '"]';
        var url = '/_design/cloudq/_view/test_results?startkey=' + encodeURIComponent(startkey) + '&endkey=' + encodeURIComponent(endkey) + '&descending=true&limit=5';
        db.request(url, function(er, testResults) {
            // Calculate pretty date for each result set; would prefer if this was
            // a filter of some kind. But at this point in the contest, I don't care.
            var result;
            for (var i = 0; i < testResults.rows.length; i++) {
                result = testResults.rows[i].value;
                result.pretty_date = prettyDate(result.date);
            }
            res.render('view/tests/show.ejs', {
                locals: {
                    id: req.params.id,
                    test: test,
                    test_results: testResults,
                    page_title: prettyUrl(test.url),
                    pretty_url: prettyUrl(test.url)
                },
                filters: { pretty: prettyDate }
            });

        })
    });
});

// Execute test runner, then redirect to results (stored in DB)
app.post('/tests/:id/run', function(req, res) {
    db.getDoc(req.params.id, function(er, doc) {
        runTests(doc.id, doc.url, function(er, testResults) {
            res.redirect('/tests/' + req.params.id);
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

        var urlRegex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
        if (url && urlRegex.test(url)) {

            var id = crypto.createHash('md5').update(url).digest('hex');
            db.saveDoc(id, {url: url, type: 'test', date: new Date() }, function(er, doc) {

                runTests(id, url, function() {}, req.params.twitter, gitPayload);
                res.redirect( '/tests/' + id );

            });
        }
    } catch (e) {
        sys.puts(e);
    }

});

var port = process.env.PORT || 8000;
app.listen(parseInt(port), null);