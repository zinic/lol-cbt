(function () {

function LocalStorageError() {
}

var html5_localstore = {

	is_supported: function () {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	},

	save: function (key, value) {
		manager.log('Saving to localStorage: ' + "manager." + key);

		window.localStorage.setItem('manager.' + key, JSON.stringify(value));
	},

	get: function (key) {
		manager.log('Loading from localStorage: ' + "manager." + key);

		var json = window.localStorage.getItem('manager.' + key);
		if (is_set(json)) {
			try {
				return JSON.parse(json);
			} catch (exception) {
				manager.log('Exception encountered trying to parse saved JSON data: ' + exception);
				throw new LocalStorageError();
			}
		}

		return null;
	},

	remove: function (key) {
		manager.log('Removing from localStorage: ' + "manager." + key);

		return window.localStorage.removeItem('manager.' + key);
	}
};

manager.html5_localstore = html5_localstore;
})();
