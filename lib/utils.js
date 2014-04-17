
exports.makeUrl = function(feed, key, worksheetKey) {
	var url = '';
	if (feed==='spreadsheets') {
		url = 'https://spreadsheets.google.com/feeds/spreadsheets/private/full/' + key;
	} else if (feed === 'worksheets') {
		url = 'https://spreadsheets.google.com/feeds/worksheets/' + key + '/private/full';
	} else if (feed === 'worksheet') {
		url = 'https://spreadsheets.google.com/feeds/worksheets/' + key + '/private/full/' + worksheetKey;
	} else if (feed === 'list') {
		url = 'https://spreadsheets.google.com/feeds/list/' + key + '/' + worksheetKey + '/private/full';
	} else if (feed === 'cells') {
		url = 'https://spreadsheets.google.com/feeds/cells/' + key + '/' + worksheetKey + '/private/full';
	}
	return url;
};