# Google Sheets
A simple to use library for interacting with Google Spreadsheets.

## Features (todo list)

### Spreadsheets
- [x] List
- [x] Get

### Worksheets
- [x] List
- [x] Get
- [x] Add
- [x] Remove
- [x] Resize

### Rows
- [x] List
- [x] Orderby & reverse support
- [x] Simple Query support
- [x] Remove
- [x] Modify

### Cells
- [ ] Modify
- [ ] Get

## How to use

```javascript
var gsheets = require('google-sheets');

// authorize your account
gsheets.auth({
	email: <YOUR GOOGLE USERNAME>,
	password: <YOUR GOOGLE PASS>
}, function(err) {
	if (err) {
		throw err;

		// list spreadsheets in the account
		gsheets.list(function(err, sheets) {
			// sheets is an array of Spreadsheet objects
		});

		// load a specific sheet
		gsheets.getSpreadsheet(<YOUR SPREADSHEET KEY HERE>, function(err, sheet) {
			if (err) {
				throw err;
			}

			// sheet is a Spreadsheet object....lets list all its worksheets
			sheet.getWorksheets(function(err, worksheets) {
				if (err) {
					throw err;
				}
				// loop over the worksheets and print their titles
				Array.forEach(worksheets, function(worksheet) {
					console.log('Worksheet : ' + worksheet.getTitle());
				});

				// set size of first worksheet
				worksheets[0].set({
					rows: 50,
					cols: 50
				});
				// save it
				worksheet[0].save(function(err, worksheet) {
					// worksheet now refers to the updated worksheet object
					// lets get its rows and add some new ones
					worksheet.getRows(function(err, rows) {
						rows.create({
							id: 1,
							date: new Date().toUTCString(),
							value: 'A new value'
						}, function(err, row) {
							// now delete it again
							rows.remove(row, function(err) {
								// remove succeeded
							});
						});
					});
				});
			});

		});
	}	
});
```

## Documentation

### Authorization
Current Google Sheets only supports authorized usage via GoogleClientLogin. It also only supports accessing spreadsheets through the private urls with the full projection. If this doesn't make any sense go read the [Google Spreadsheets API documentation](https://developers.google.com/google-apps/spreadsheets/). 

```javascript
var gsheets = require('google-sheets');

// authorize your account
gsheets.auth({
	email: <YOUR GOOGLE USERNAME>,
	password: <YOUR GOOGLE PASS>
}, function(err) {
```

### Spreadsheets

#### List

#### Get

### Worksheets

#### List
#### Get
#### Rename
#### Resize

### Rows
Rows support is operational, but is not yet stable. The interface is likely to change as I don't like the architecture currently, however it does all currently work.

### Get Rows
### Orderby
### Reverse
### Simple Query
### Modify Rows

### Cells
Cells support is not currently implemented but is planned.
