(function () {
var json = {
	PATH_REGEX: /^(\['?([\w\d]+)'?\]).*/,

	UnresolvableJSONPathError: function (msg) {
		this.msg = msg;
	},

	MalformedJSONPathError: function (msg) {
		this.msg = msg;
	},

	JSONEntity: function (parent, path) {
		this.parent = parent;
		this.path = path;

		this.remove = function() {
			delete this.parent[this.path];
		},

		this.get = function () {
			return is_set(this.path) ? this.parent[this.path] : null;
		},

		this.set = function (new_value) {
			this.parent[this.path] = new_value;
		}
	},

	locate: function (specifier, object) {
		manager.log('Locating element by specifier: ' + specifier);

		try {
			var target = jsonPath(object, specifier, {
				resultType: 'PATH'
			});
		} catch (exception) {
			manager.log(exception);
			throw new this.MalformedJSONPathError('Malformed JSONPath: ' + specifier);
		}

		if (is_set(target) && target) {
			var path = target[0].replace(/\$/, '');
			var parent = object, child_path;

			for (var depth = 0; depth < 20 && path.length > 1; depth++) {
				var match = this.PATH_REGEX.exec(path);

				if (is_set(match) && match) {
					path = path.substring(match[1].length, path.length);

					if (path.length > 0) {
						parent = parent[match[2]];
					} else {
						child_path = match[2];
					}
				} else {
					manager.log('Unable to match against: ' + path);
				}
			}

			manager.log('Child path should be: ' + child_path);

			return new this.JSONEntity(parent, child_path);
		} else {
			throw new this.UnresolvableJSONPathError('Unable to resolve JSONPath: ' + specifier);
		}
	}
};

manager.json = json;
})();
