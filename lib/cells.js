var request = require('request'),
	builder = require('xmlbuilder'),
	xml2js = require('xml2js'),
	makeUrl = require('./utils').makeUrl,
	_ = require('underscore');

function Cells(data,authId) {
	this.authId = authId;
	this.cells = [];
	this.colToHeaderMap = {};
	this.headerToColMap = {};
	this.rows = {};
	this.parse(data);
}
Cells.prototype = {
	query: function(options, callback) {
		request({
			url: options.url,
			method: options.method || 'GET',
			body: options.body || null,
			headers: _.extend(options.headers || {} , {
				'Authorization': 'GoogleLogin auth=' + this.authId,
				'Content-Type': 'application/atom+xml',
				'If-Match': '*'
			})
		}, function(error, response, body) {
			if (error) {
				return callback(error);
			}
			var parser = new xml2js.Parser({
				explicitArray: false,
				async: true,
				mergeAttrs: true
			});
			if (body) {
				parser.parseString(body, function(err, result) {
					if (err) {
						return callback(body);
					}
					callback(err, result);
				});
			} else {
				callback();
			}
		});
	},
	parseEntry: function(entry) {
		var cell = {
			id: entry.id,
			lastModified: entry.updated,
			title: entry.title._,
			content: entry.content._,
			data: {}
		};
		for (var k=0; k < entry.link.length; k++) {
			if (entry.link[k].rel == 'edit') {
				cell.editUrl = entry.link[k].href;
			}
		}
		for (var key in entry) {
			if (key.indexOf('gs:cell')===0) {
				//if (!_.isEmpty(entry[key])) {
				cell.data = entry[key]._;
				cell.row = entry[key].row;
				cell.col = entry[key].col;
				cell.inputValue = entry[key].inputValue;
				//}
			}
		}
		return cell;
	},
	parse: function(data) {
		var i = 0;

		this.id = data.feed.id;

		// loop over links
		for (i=0; i < data.feed.link.length; i++) {
			if (data.feed.link[i].rel == 'http://schemas.google.com/g/2005#post') {
				this.postUrl = data.feed.link[i].href;
			}
		}
		this.startIndex = parseInt(data.feed['openSearch:startIndex'],10);
		this.rowCount = parseInt(data.feed['gs:rowCount'], 10);
		this.colCount = parseInt(data.feed['gs:colCount'], 10);
		if (data.feed['openSearch:itemsPerPage']) {
			this.itemsPerPage = parseInt(data.feed['openSearch:itemsPerPage'],10);
		}

		// loop over items and create Row objects
		var entries = data.feed.entry;
		var cells = [], cell;
		if (Array.isArray(entries)) {
			for (i=0; i < entries.length; i++) {
				var entry = entries[i];
				cell = this.parseEntry(entry);
				cells.push(cell);
			}
		} else if (entries) {
			cell = this.parseEntry(entries);
			cells.push(cell);
		}
		this.cells = cells;

		var self = this;
		this.cells.forEach(function(c) {
			if (c.row === '1') {
				var normalizedHeader = c.data.toString().replace(/\s+/g, '').toLowerCase();
				self.colToHeaderMap[c.col] = normalizedHeader;
				self.headerToColMap[normalizedHeader] = c.col;
			}
		});

		this.cells.forEach(function(c) {
			if (!self.rows[c.row]) {
				self.rows[c.row] = {};
			}
			self.rows[c.row][self.colToHeaderMap[c.col]] = c;
		});
	},
	update: function(cells, callback) {
		if (!Array.isArray(cells)) {
			cells = Object.keys(cells).map(function(k) {
				return cells[k];
			});
		}
		// modify a row, then pass it to this function to save it, only modifications to data info is allowed
		var doc = builder.create(),
			that = this;

		var document = doc.begin('feed')
				.att('xmlns','http://www.w3.org/2005/Atom')
				.att('xmlns:batch','http://schemas.google.com/gdata/batch')
				.att('xmlns:gs','http://schemas.google.com/spreadsheets/2006');
		document.ele('id').txt(this.id).up();

		cells.forEach(function(c) {
			var batchId = 'R' + c.row + 'C' + c.col;
			var entry = document.ele('entry');
			if (c.title) {
				entry.ele('batch:id').txt(c.title).up();
			} else {
				var title = that.numbersToLetters(parseInt(c.col, 10)) + c.row;
				entry.ele('batch:id').txt(title).up();
			}
			entry.ele('batch:operation').att('type', 'update');
			if (c.id) {
				entry.ele('id').txt(c.id).up();
			} else {
				entry.ele('id').txt(that.id + '/' + batchId).up();
			}
			var editLink = entry.ele('link')
				.att('rel', 'edit')
				.att('type', 'application/atom+xml');
			if (c.editUrl) {
				editLink.att('href', c.editUrl);
			} else {
				editLink.att('href', that.id + '/' + batchId + '/version');
			}

			entry.ele('gs:cell')
				.att('row', c.row.toString())
				.att('col', c.col.toString())
				.att('inputValue', c.data);
		});
		// post to edit url
		var url = this.id + '/batch';
		this.query({
			url: url,
			method: 'POST',
			body: doc.toString()
		}, function(err, data) {
			if (err) {
				return callback(err);
			}
			return callback(null);
			// todo - really should update state based on result.
			/*
			var row = that.parseEntry(data.entry);
			that.rows.push(row);
			callback(null, row);
			*/
		});
	},
	forEach: function(callback) {
		this.rows.forEach(callback);
	},
	getCell: function(row, col) {
		row = row.toString();
		if (this.rows[row]) {
			return this.rows[row][this.colToHeaderMap[col.toString()]];
		} else {
			return null;
		}
	},
	getRow: function(row) {
		if (this.rows[row.toString()]) {
			return this.rows[row.toString()];
		} else {
			return null;
		}
	},
	getRows: function() {
		return this.rows;
	},
	getCells: function() {
		return this.cells;
	},
	numbersToLetters: function(num) {
		var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j = num, result = '';
		while (j > 0) {
			var index = j % base.length;
			result = result + base[index - 1];
			j = j - index;
		}
		return result;
	}
};

exports.Cells = Cells;