var request = require('request'),
	GoogleClientLogin = require('googleclientlogin').GoogleClientLogin,
	url = require('url'),
	builder = require('xmlbuilder'),
	xml2js = require('xml2js');

function authorize(options, callback) {
	var googleAuth = new GoogleClientLogin({
		email: options.email,
		password: options.password,
		service: 'spreadsheets',
		accountType: GoogleClientLogin.accountTypes.google
	});
	googleAuth.on(GoogleClientLogin.events.login, function(){
		// do things with google services
		callback(null, googleAuth.getAuthId());
	});
	googleAuth.on(GoogleClientLogin.events.error, function(e) {
		switch(e.message) {
			case GoogleClientLogin.errors.loginFailed:
				if (this.isCaptchaRequired()) {
					return callback('captcha required', {
						error: 'Process captcha then recall function with captcha and token parameters',
						captchaUrl: this.getCaptchaUrl(),
						captchaToken: this.getCaptchaToken()
					});
				}
				break;
			case GoogleClientLogin.errors.tokenMissing:
			case GoogleClientLogin.errors.captchaMissing:
				return callback('captcha missing', {error: 'You must pass the both captcha token and the captcha'});
		}
		callback('unkown error',{error: 'Unknown error in GoogleClientLogin.'});
	});
	var captcha = undefined;
	if (options.captcha) {
		captcha = {logincaptcha: options.captcha, logintoken: options.token};
	}
	googleAuth.login(captcha);
}

function makeUrl(feed, key) {
	var url = '';
	if (feed==='spreadsheets') {
		url = 'https://spreadsheets.google.com/feeds/spreadsheets/private/full/' + key;
	} else if (feed === 'worksheets') {
		url = 'https://spreadsheets.google.com/feeds/worksheets/' + key + '/private/full';
	}
	return url;
}

function Spreadsheet(meta, authId) {
	this.meta = meta;
	this.authId = authId;
}
Spreadsheet.prototype = {

	query: function(options, callback) {
		request({
			url: options.url,
			method: options.method || 'GET',
			body: options.body || null,
			headers: {
				'Authorization': 'GoogleLogin auth=' + this.authId,
				'Content-Type': 'application/atom+xml'
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

	parseWorksheet: function(entry) {
		var worksheet = {
			lastModified: entry.updated,
			url: entry.id,
			title: entry.title._,
			rowCount: entry['gs:rowCount']._,
			colCount: entry['gs:colCount']._
		};
		return worksheet;
	},

	getWorksheets: function(callback) {
		var that = this;
		this.query({
			url: makeUrl('worksheets',this.meta.id)
		}, function(err, result) {
			if (err) {
				return callback(err);
			}
			var worksheets = [];
			for(var i=0; i < result.feed.entry.length; i++) {
				var entry = result.feed.entry[i],
					worksheet = that.parseWorksheet(entry);

				worksheets.push(worksheet);
			}
			callback(null, worksheets);
		});
	},
	addWorksheet: function(data, callback) {
		var that = this,
			doc = builder.create(),
			options = {
				title: data.title || 'Untitled Worksheet',
				rowCount: data.rowCount || 50,
				colCount: data.colCount || 10
			};

		doc.begin('entry')
				.att('xmlns','http://www.w3.org/2005/Atom')
				.att('xmlns:gs','http://schemas.google.com/spreadsheets/2006')
			.ele('title')
				.txt(options.title)
				.up()
			.ele('gs:rowCount')
				.txt(options.rowCount)
				.up()
			.ele('gs:colCount')
				.txt(options.colCount);

		this.query({
			url: makeUrl('worksheets',this.meta.id),
			method: 'POST',
			body: doc.toString()
		}, function(err, data) {
			if (err) {
				return callback(err);
			}
			var worksheet = that.parseWorksheet(data.entry);
			callback(null, worksheet);
		});
	}
};

module.exports = {
	authId: null,
	version: 0.1,

	auth: function(params, callback) {
		authorize(params, function(err, value) {
			if (err) {
				return callback(err,value);
			}
			this.authId = value;
			callback(null, this.authId);
		}.bind(this));
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
			//console.log(JSON.stringify(result));
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