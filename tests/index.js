module.exports = {
	setUp: function(callback) {
		if (!process.env.GSHEETS_USER || !process.env.GSHEETS_PASS) {
			console.log('ERROR: Must specify GSHEETS_USER, GSHEETS_PASS credentials for google account on which to test');
			return setTimeout(function() {
				process.exit(-1);
			},50);
		}
		if (!process.env.GSHEETS_TEST_KEY) {
			console.log('ERROR: Must specify GSHEETS_TEST_KEY pointing to a copy of the test document found here http://goo.gl/SsM4j');
			return setTimeout(function() {
				process.exit(-1);
			},50);
		}
		callback();
	},


	"auth": require('./auth'),

	"spreadsheets": require('./spreadsheets'),

	"worksheets": require('./worksheets'),

	"rows": require('./rows')
	
	//"cells": require('./cells')
};

