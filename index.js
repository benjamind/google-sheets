var request = require('request'),
	GoogleClientLogin = require('googleclientlogin').GoogleClientLogin,
	url = require('url'),
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

	list: function(callback) {
		var listUrl = 'https://spreadsheets.google.com/feeds/spreadsheets/private/full';

		// do request for list of spreadsheets
		if (!this.authId) {
			return callback('auth required');
		}

		request({
			url: listUrl,
			method: 'GET',
			headers: {
				'Authorization': 'GoogleLogin auth=' + this.authId
			}
		},function(error, response, body) {
			if (!error && response.statusCode == 200) {
				// success!
				var parser = new xml2js.Parser({
					explicitArray: false,
					async: true,
					mergeAttrs: true
				});
				parser.parseString(body, function(err, result) {
					var sheets = [];
					//console.log(JSON.stringify(result));
					for(var i=0; i < result.feed.entry.length; i++) {
						var entry = result.feed.entry[i],
							sheet = {
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

						sheets.push(sheet);
					}
					callback(null,sheets);
				});
			} else {
				callback(error);
			}
		});
	}
};