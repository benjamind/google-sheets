var gsheets = require('../index'),
	async = require('async');

var theSheet = null, theWorksheet = null;

module.exports = {

	setUp: function(callback) {
		gsheets.auth({
			email: process.env.GSHEETS_USER,
			password: process.env.GSHEETS_PASS
		}, function(err) {
			if (err) {
				throw err;
			}
			gsheets.getSpreadsheet(process.env.GSHEETS_TEST_KEY, function(err, sheet) {
				if (err) {
					throw err;
				}
				theSheet = sheet;
				callback();
			});
		});
	},
	tearDown: function(callback) {
		theSheet = null;
		callback();
	},
	"get single worksheet": function(test) {
		test.expect(4);
		gsheets.getSpreadsheet('0Ak3gStO7i2cYdE0wdm1FNG1hOXh6V25aQl81bXBjTHc', function(err, sheet) {
			test.ifError(err);
			theSheet = sheet;
			theSheet.getWorksheets(function(err, worksheets) {
				test.ifError(err);
				test.ok(Array.isArray(worksheets), 'Should get an array of worksheets');
				test.ok(worksheets.length === 1, 'Should get 1 worksheets from the sheet got ' + worksheets.length);
				test.done();
			});
		});
	},
	"get worksheets": function(test) {
		test.expect(3);
		theSheet.getWorksheets(function(err, worksheets) {
			test.ifError(err);
			test.ok(Array.isArray(worksheets), 'Should get an array of worksheets');
			test.ok(worksheets.length === 3, 'Should get 3 worksheets from the sheet (check the test sheet is in its correct state)');
			test.done();
		});
	},
	"get worksheet by index": function(test) {
		test.expect(3);
		theSheet.getWorksheetAt(1,function(err, worksheet) {
			test.ifError(err);
			test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
			test.ok(worksheet.getTitle()=='2nd Sheet', "Got the wrong worksheet, expected '2nd Sheet' got " + worksheet.getTitle());
			test.done();
		});
	},
	"get worksheet by invalid index": function(test) {
		test.expect(1);
		theSheet.getWorksheetAt(4,function(err, worksheet) {
			test.ok(err, 'Should throw an out of bounds error');
			test.done();
		});
	},
	"get worksheet by name": function(test) {
		test.expect(3);
		theSheet.getWorksheet('& a third sheet!',function(err, worksheet) {
			test.ifError(err);
			test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
			test.ok(worksheet.getTitle()=='& a third sheet!', "Got the wrong worksheet, expected '& a third sheet!' got " + worksheet.getTitle());
			test.done();
		});
	},
	"get worksheet by invalid name": function(test) {
		test.expect(1);
		theSheet.getWorksheet('some invalid worksheet name',function(err, worksheet) {
			test.ok(err, 'Should throw a not found error');
			test.done();
		});
	},
	"no add worksheet permission": function(test) {
		test.expect(1);
		gsheets.getSpreadsheet('0Ak3gStO7i2cYdGRrRU9GWF83UW1kTHB4eW1SbTE3M3', function(err, sheet) {
			test.ok(err, "Should throw an error if you don't have permission");
			test.done();
		});
	},
	"add and delete worksheet": function(test) {
		test.expect(4);
		theSheet.addWorksheet({
			title: 'A Test Worksheet'
		}, function(err, worksheet) {
			test.ifError(err);

			test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');

			test.ok(worksheet.getTitle() === 'A Test Worksheet');

			// now delete it if this fails, fail the test as we'll corrupt our data!
			theSheet.deleteWorksheet(worksheet, function(err) {
				test.ifError(err);
				test.done();
			});
		});
	},
	"save worksheet": function(test) {
		test.expect(7);
		theSheet.addWorksheet({
			title: 'A Test Worksheet'
		}, function(err, worksheet) {
			test.ifError(err);
			test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
			test.ok(worksheet.meta.title === 'A Test Worksheet');
			// rename it
			worksheet.set({
				title: 'Another worksheet'
			});
			worksheet.save(function(err, worksheet) {
				test.ifError(err);
				test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
				test.ok(worksheet.getTitle() === 'Another worksheet', 'Expected Another Worsheet got ' + worksheet.getTitle());
				// now delete it if this fails, fail the test as we'll corrupt our data!
				theSheet.deleteWorksheet(worksheet, function(err) {
					test.ifError(err);
					test.done();
				});
			});
		});
	},
	"resize worksheet": function(test) {
		test.expect(7);
		theSheet.addWorksheet({
			title: 'A Test Worksheet',
			rows: 5
		}, function(err, worksheet) {
			test.ifError(err);
			test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
			test.ok(worksheet.meta.title === 'A Test Worksheet');
			// rename it
			worksheet.set({
				title: 'A new worksheet',
				rows: 34
			});
			worksheet.save(function(err, worksheet) {
				test.ifError(err);
				test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
				test.ok(worksheet.meta.rows==34,'Should have 34 rows found ' + worksheet.meta.rows);
				theSheet.deleteWorksheet(worksheet, function(err) {
					test.ifError(err);
					test.done();
				});
			});
		});
	}
};