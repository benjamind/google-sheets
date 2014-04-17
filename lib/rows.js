var request = require('request'),
	builder = require('xmlbuilder'),
	xml2js = require('xml2js'),
	makeUrl = require('./utils').makeUrl,
	_ = require('underscore');

function Rows(data,authId) {
	this.authId = authId;
	this.rows = [];
	this.parse(data);
}
Rows.prototype = {
	query: function(options, callback) {
		request({
			url: options.url,
			method: options.method || 'GET',
			body: options.body || null,
			headers: _.extend(options.headers || {} , {
				'Authorization': 'GoogleLogin auth=' + this.authId,
				'Content-Type': 'application/atom+xml'
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
		var row = {
			id: entry.id,
			lastModified: entry.updated,
			title: entry.title._,
			content: entry.content._,
			data: {}
		};
		for (var k=0; k < entry.link.length; k++) {
			if (entry.link[k].rel == 'edit') {
				row.editUrl = entry.link[k].href;
			}
		}
		for (var key in entry) {
			if (key.indexOf('gsx:')===0) {
				var rowName = key.substr('gsx:'.length);
				if (!_.isEmpty(entry[key])) {
					row.data[rowName] = entry[key];
				}
			}
		}
		return row;
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
		this.totalResults = parseInt(data.feed['openSearch:totalResults'],10);
		this.startIndex = parseInt(data.feed['openSearch:startIndex'],10);
		if (data.feed['openSearch:itemsPerPage']) {
			this.itemsPerPage = parseInt(data.feed['openSearch:itemsPerPage'],10);
		}

		// loop over items and create Row objects
		var entries = data.feed.entry;
		var rows = [], row;
		if (Array.isArray(entries)) {
			for (i=0; i < entries.length; i++) {
				var entry = entries[i];
				row = this.parseEntry(entry);
				rows.push(row);
			}
		} else if (entries) {
			row = this.parseEntry(entries);
			rows.push(row);
		}
		this.rows = rows;
	},
	create: function(row, callback) {
		// modify a row, then pass it to this function to save it, only modifications to data info is allowed
		var doc = builder.create(),
			that = this;

		var document = doc.begin('entry')
				.att('xmlns','http://www.w3.org/2005/Atom')
				.att('xmlns:gsx','http://schemas.google.com/spreadsheets/2006/extended');

		for (var key in row) {
			var keyname = key.toLowerCase().replace('[^a-z0-9]','');
			document.ele('gsx:' + keyname)
				.txt(row[key]);
		}
		// post to edit url
		this.query({
			url: this.postUrl,
			method: 'POST',
			body: doc.toString()
		}, function(err, data) {
			if (err) {
				return callback(err);
			}
			var row = that.parseEntry(data.entry);
			that.rows.push(row);
			callback(null, row);
		});
	},
	forEach: function(callback) {
		this.rows.forEach(callback);
	},
	getRow: function(index) {
		return this.rows[index];
	},
	getRows: function() {
		return this.rows;
	},
	remove: function(row, callback) {
		var that = this;
		this.query({
			url: row.id,
			method: 'GET'
		}, function(err, rowData) {
			var entry = that.parseEntry(rowData.entry);
			that.query({
				url: entry.editUrl,
				method: 'DELETE'
			}, function(err) {
				if (err) {
					return callback(err);
				}
				callback();
			});
		});
	},
	save: function(row, options, callback) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}
		// modify a row, then pass it to this function to save it, only modifications to data info is allowed
		if (!row.editUrl || !row.id) {
			return this.create(row, callback);
		}

		var doc = builder.create(),
			that = this;

		var document = doc.begin('entry')
				.att('xmlns','http://www.w3.org/2005/Atom')
				.att('xmlns:gsx','http://schemas.google.com/spreadsheets/2006/extended')
			.ele('id')
				.txt(row.id)
				.up();
		for (var key in row.data) {
			if (row.data[key]) {
				document.ele('gsx:' + key)
					.txt(row.data[key]);
			}
		}
		// post to edit url
		this.query(_.extend(options, {
			url: row.editUrl,
			method: 'PUT',
			body: doc.toString()
		}), function(err, data) {
			if (err) {
				return callback(err);
			}
			var row = that.parseEntry(data.entry);
			callback(null, row);
		});
	}
};

exports.Rows = Rows;