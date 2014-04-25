var request = require('request'),
	builder = require('xmlbuilder'),
	xml2js = require('xml2js'),
	querystring = require('querystring'),
	Rows = require('./rows').Rows,
	Cells = require('./cells').Cells,
	makeUrl = require('./utils').makeUrl,
	_ = require('underscore');

function Worksheet(meta, authId) {
	this.meta = meta;
	this.authId = authId;
}
Worksheet.prototype = {
	createXML: function() {
		var doc = builder.create(),
			options = {
				title: this.meta.title || 'Untitled Worksheet',
				rows: this.meta.rows || 50,
				cols: this.meta.cols || 10
			};

		doc.begin('entry')
				.att('xmlns','http://www.w3.org/2005/Atom')
				.att('xmlns:gs','http://schemas.google.com/spreadsheets/2006')
			.ele('title')
				.txt(options.title)
				.up()
			.ele('gs:rowCount')
				.txt(""+options.rows)
				.up()
			.ele('gs:colCount')
				.txt(""+options.cols);
		return doc.toString();
	},
	saveXML: function() {
		var doc = builder.create();

		doc.begin('entry')
				.att('xmlns','http://www.w3.org/2005/Atom')
				.att('xmlns:gs','http://schemas.google.com/spreadsheets/2006')
			.ele('id')
				.txt(this.meta.url)
				.up()
			.ele('title')
				.att('type', 'text')
				.txt(this.meta.title)
				.up()
			.ele('gs:rowCount')
				.txt(""+this.meta.rows)
				.up()
			.ele('gs:colCount')
				.txt(""+this.meta.cols);
		return doc.toString();
	},
	create: function(callback) {
		var that = this;

		this.query({
			url: makeUrl('worksheets',this.meta.spreadsheetId),
			method: 'POST',
			body: this.createXML()
		}, function(err, data) {
			if (err) {
				return callback(err);
			}
			that.parseJSON(data.entry);
			callback(null, that);
		});

	},
	save: function(callback) {
		if (!this.meta.editUrl) {
			// create instead
			return this.create(callback);
		}
		// otherwise save to edit url

		var that = this,
			xml = this.saveXML();

		this.query({
			url: this.meta.url,
			method: 'GET'
		}, function(err, entryData) {
			var entry = that.parseJSON(entryData.entry);
			that.query({
				url: entry.editUrl,
				method: 'PUT',
				body: xml
			}, function(err, data) {
				if (err) {
					return callback(err);
				}
				that.parseJSON(data.entry);
				callback(null, that);
			});
		});
	},
	remove: function(callback) {
		this.query({
			url: this.meta.editUrl,
			method: 'DELETE'
		}, function(err) {
			callback(err);
		});
	},
	set: function(options) {
		this.meta = _.extend(this.meta, options);
	},
	setTitle: function(title) {
		this.meta.title = title;
	},
	getTitle: function() {
		return this.meta.title;
	},
	query: function(options, callback) {
		request({
			url: options.url,
			method: options.method || 'GET',
			body: options.body || null,
			headers: {
				'Authorization': 'GoogleLogin auth=' + this.authId,
				'Content-Type': 'application/atom+xml',
				'If-Match': '*'
			}
		}, function(error, response, body) {
			if (error) {
				return callback(error);
			}
			if (body!==undefined) {
				var parser = new xml2js.Parser({
					explicitArray: false,
					async: true,
					mergeAttrs: true
				});
				parser.parseString(body, function(err, result) {
					if (err) {
						// if an error occurred in the parsing, we can assume we got a non-xml result from google
						// pass that error back instead
						return callback(body);
					}
					callback(err, result);
				});
			} else {
				callback();
			}
		});
	},
	parseJSON: function(entry) {
		var worksheet = {
			lastModified: entry.updated,
			title: entry.title._,
			url: entry.id,
			rows: parseInt(entry['gs:rowCount'],10),
			cols: parseInt(entry['gs:colCount'],10)
		};
		// parse id from url
		worksheet.id = worksheet.url.substr(worksheet.url.lastIndexOf('/')+1);
		// loop over links
		for (var i=0; i < entry.link.length; i++) {
			if (entry.link[i].rel==='edit') {
				worksheet.editUrl = entry.link[i].href;
			}
		}
		this.meta = _.extend(this.meta, worksheet);
		return this.meta;
	},

	getRows: function(options,callback) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}

		if (options.orderby) {
			options.orderby = 'gsx:' + options.orderby;
		}
		var sq = null;
		if (options.sq) {
			sq = options.sq;
			delete options.sq;
		}

		var that = this,
			url =  makeUrl('list', this.meta.spreadsheetId, this.meta.id) + '?' + querystring.stringify(options);

		if (sq) {
			sq = encodeURIComponent(sq);
			sq = sq.replace('%3E', '>').replace('%3C','<');
			url += '&sq=' + sq;
		}

		this.query({
			url:url,
			method: 'GET'
		}, function(err, data) {
			if (err) {
				return callback(err);
			}

			// parse rows into row objects we can update and save in the worksheet
			var rows = new Rows(data, that.authId);
			that.rows = rows;
			callback(null, rows);
		});
	},

	getCells: function(options,callback) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}

		if (options.minRow) {
			options['min-row'] = options.minRow;
			delete options.minRow;
		}
		if (options.maxRow) {
			options['max-row'] = options.maxRow;
			delete options.maxRow;
		}

		if (options.minCol) {
			options['min-col'] = options.minCol;
			delete options.minCol;
		}
		if (options.maxCol) {
			options['max-col'] = options.maxCol;
			delete options.maxCol;
		}

		var that = this,
			url =  makeUrl('cells', this.meta.spreadsheetId, this.meta.id) + '?' + querystring.stringify(options);

		this.query({
			url:url,
			method: 'GET'
		}, function(err, data) {
			if (err) {
				return callback(err);
			}

			// parse rows into row objects we can update and save in the worksheet
			var cells = new Cells(data, that.authId);
			that.cells = cells;
			callback(null, cells);
		});
	}
};

exports.Worksheet = Worksheet;