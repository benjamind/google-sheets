var Rows = require('./rows').Rows,
	Cells = require('./cells').Cells,
	Worksheet = require('./worksheet').Worksheet,
	Spreadsheet = require('./spreadsheet').Spreadsheet,
	authorize = require('./auth').authorize,
	makeUrl = require('./utils').makeUrl,
	request = require('request'),
	xml2js = require('xml2js'),
	url = require('url');

module.exports = {
	authId: null,

	Worksheet: Worksheet,
	Spreadsheet: Spreadsheet,
	Rows: Rows,
	Cells: Cells,

	auth: function(params, callback) {
		authorize(params, function(err, value) {
			if (err) {
				return callback(err,value);
			}
			this.authId = value;
			callback(null, this.authId);
		}.bind(this));
	},
	logout: function() {
		this.authId = null;
	},
	parseSheet: function(entry) {
		var sheet = {
			lastModified: entry.updated,
			url: entry.id,
			author: {
				name: entry.author.name,
				email: entry.author.email
			},
			title: entry.title._
		};
		if (entry.link && entry.link[1] && entry.link[1].href && entry.link[1].rel=='alternate') {
			var keyUrl = entry.link[1].href,
				parsedUrl = url.parse(keyUrl,true);

			sheet.key = parsedUrl.query.key;
		}
		sheet.id = entry.id.substring(entry.id.lastIndexOf('/')+1);
		return new Spreadsheet(sheet, this.authId);
	},

	list: function(callback) {
		var listUrl = 'https://spreadsheets.google.com/feeds/spreadsheets/private/full', that = this;

		// do request for list of spreadsheets
		if (!this.authId) {
			return callback('auth required');
		}

		this.query({
			url: listUrl
		}, function(err, result) {
			if (err) {
				return callback(err);
			}
			var sheets = [];
			for(var i=0; i < result.feed.entry.length; i++) {
				var entry = result.feed.entry[i],
					sheet = that.parseSheet(entry);
				sheets.push(sheet);
			}
			callback(null,sheets);
		});
	},

	query: function(options, callback) {
		request({
			url: options.url,
			method: options.method || 'GET',
			body: options.body || null,
			headers: {
				'Authorization': 'GoogleLogin auth=' + this.authId
			}
		}, function(error, response, body) {
			if (error) {
				return callback(error);
			}
			var parser = new xml2js.Parser({
				explicitArray: false,
				async: true,
				mergeAttrs: true
			});
			parser.parseString(body, function(err, result) {
				callback(err, result);
			});
		});
	},

	getSpreadsheet: function(key, callback) {
		// creates a spreadsheet object, having first confirmed the sheet exists
		//try and get the url
		if (!this.authId) {
			return callback('auth required');
		}
		var sheetUrl = makeUrl('spreadsheets',key), that = this;
		this.query({
			url: sheetUrl
		},function(err, result) {
			if (err) {
				return callback(err);
			}
			if (!result) {
				return callback(null,null);
			}
			// assume it worked, parse the spreadsheet
			callback(null, that.parseSheet(result.entry));
		});
	}
};