/* This is purely experimental! */

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

	"get all cells": function(test) {
		test.expect(4);
		// get first worksheet and retrieve its rows
		theSheet.getWorksheet('Sheet1', function(err, worksheet) {
			test.ifError(err);
			test.ok(worksheet instanceof gsheets.Worksheet, 'Should return an instance of a worksheet');
			// get rows
			worksheet.getCells({maxRow: worksheet.meta.rows}, function(err, cells) {
				test.ifError(err);
				test.ok(cells instanceof gsheets.Cells, 'Should return an instance of Cells');
				var rowData = cells.getRows();
				console.log(Object.keys(rowData));
				//test.ok(rowData['6'].email.data == 'zumbino@gmail.com');
				var testRow = cells.getRow(6);
				var rowToUpdate = {};
				Object.keys(testRow).forEach(function(k) {
					rowToUpdate[k] = testRow[k].data;
				});
				rowToUpdate.email = 'final value';
				console.log(rowToUpdate);
				Object.keys(rowToUpdate).forEach(function(k) {
					if (testRow[k]) {
						testRow[k].data = rowToUpdate[k];
					} 
				});
				cells.update(testRow, function(err) {
					test.done();
				});
			});
		});
	},
};