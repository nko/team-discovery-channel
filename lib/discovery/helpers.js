/**
 * Team Discovery Channel 2010
 *
 * Various Helper Functions to make our lives easier.
 */
 
 var fs = require('fs');
 var configPath = 'config/';

/**
 * Load JSON configuration files from /config.
 */
 exports.loadJSONConfiguration = function( configName ) {
     var textContents = fs.readFileSync(configPath + configName + '.json');
     return JSON.parse( textContents );
 }