var gsheets = require('../index');

gsheets.auth({
	email: process.env.GSHEETS_USER,
	password: process.env.GSHEETS_PASS
}, function(err) {

	/*gsheets.list(function(err, sheets) {
		console.log('List callback err:' + err);
		console.log('Found ' + sheets.length + ' sheets');
	});*/

	gsheets.getSpreadsheet('0Ak3gStO7i2cYdGhTNlVqaEtuVnJHLTBlaFh2N2k5TVE', function(err, sheet) {
		console.log('getSpreadsheet callback err:' + err);
		//console.log('Retrieved sheet :' + JSON.stringify(sheet));

		// get worksheets
		sheet.getWorksheets(function(err, worksheets) {
			if (err) {
				return console.log('ERR: ' + err);
			}
			console.log('Found ' + worksheets.length + ' worksheets');
			//console.log('Worksheet : ' + JSON.stringify(worksheets));
		});
		sheet.addWorksheet({
			title: 'New worksheet'
		}, function(err, sheet) {
			if (err) {
				return console.log('ERR: ' + err);
			}
			console.log('Created worksheet : ' + JSON.stringify(sheet));
		});
	});
});