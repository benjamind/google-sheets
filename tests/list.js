var gsheets = require('../index');

gsheets.auth({
	email: process.env.GSHEETS_USER,
	password: process.env.GSHEETS_PASS
}, function(err) {
	gsheets.list(function(err, sheets) {
		console.log('List callback err:' + err);
		console.log(JSON.stringify(sheets));
	});
});