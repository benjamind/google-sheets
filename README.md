## How to use

```
var GSheets = require('google-sheets');

GSheets.list({
	email:''
	password: ''
}, function(err, spreadsheets) {
	// do something with the array of sheets
});

spreadsheet.getWorksheets(function(err, worksheets) {
	
});

spreadsheet.addWorksheet({
	title: 'New Sheet',
	rowCount: 50,
	colCount: 10
}, function(err, worksheet) {
	
});

worksheet.rowCount = 45;
worksheet.colCount = 15;
worksheet.save(function(err, worksheet) {
	
});

worksheet.delete(function(err) {
	
});

