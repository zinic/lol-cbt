(function () {
var CONDITIONAL_REGEX = '([\s\S]+?)?\$if[^{]+{([^}]+)}([\s\S]+?)(?:\$else([\s\S]+?))?\$endif([\s\S]+)?';
var HEX_CHARACTER_VALUES = "0123456789abcdef";

var common = {
	uuid4: function () {
		// http://www.ietf.org/rfc/rfc4122.txt
		var s = [];

		for (var i = 0; i < 36; i++) {
			var target_index = Math.floor(Math.random() * 0x10);
			s[i] = HEX_CHARACTER_VALUES[target_index];
		}

		// bits 12-15 of the time_hi_and_version field to 0010
		s[14] = "4";

		// bits 6-7 of the clock_seq_hi_and_reserved to 01
		s[19] = HEX_CHARACTER_VALUES[(s[19] & 0x3) | 0x8];

		// formatting
		s[8] = s[13] = s[18] = s[23] = "-";
		return s.join("");
	},

	notify: {
		raise: function (msg, type) {
			$.notify(msg, {
				className: type
			});
		},

		error: function (msg) {
			this.raise(msg, 'error');
		},

		warn: function (msg) {
			this.raise(msg, 'warn');
		},

		info: function (msg) {
			this.raise(msg, 'info');
		},

		success: function (msg) {
			this.raise(msg, 'success');
		}
	},

	clone: function (obj) {
		return JSON.parse(JSON.stringify(obj));
	},

	dict_len: function (obj) {
		var size = 0;

		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				size++;
			}
		}
		return size;
	},

	process_template: function (template, value_dict, prefix) {
		// Find conditional blocks
		var match = /([\s\S]+?)?\$if[^{]+{([^}]+)}([\s\S]+?)(?:\$else([\s\S]+?))?\$endif([\s\S]+)?/gm.exec(template);
		var conditional_blocks = [];

		while(is_set(match)) {
			var next_block = {
				prefix: match[1],
				condition: match[2],
				on_true: match[3],
				on_false: match[4],
				suffix: ''
			};

			conditional_blocks.push(next_block);

			var suffix = match[5];
			match = /([\s\S]+?)?\$if[^{]+{([^}]+)}([\s\S]+?)(?:\$else([\s\S]+?))?\$endif([\s\S]+)?/gm.exec(suffix);

			if (!is_set(match)) {
				next_block.suffix = suffix;
				break;
			}
		}

		var processed_template = '';

		if (conditional_blocks.length > 0) {
			for (var i = 0; i < conditional_blocks.length; i++) {
				var block = conditional_blocks[i];
				var scope = {
					__condition: block.condition,
					__retval: false
				};

				for (var key in value_dict) {
					if (key === '__condition' || key === '__retval') {
						continue;
					}

					scope[key] = value_dict[key];
				}

				with (scope) {
					var retval = eval(scope.__condition);
					scope.__retval = get_or(retval, false);
				}

				processed_template += block.prefix;

				if (scope.__retval == true) {
					processed_template += block.on_true;
				} else if (is_set(block.on_false)) {
					processed_template += block.on_false;
				}

				processed_template += block.suffix;
			}
		} else {
			processed_template = template;
		}

		// Fill in values
		var object_stack = [{
			prefix: '',
			target: value_dict
		}];

		while (object_stack.length > 0) {
			var next = object_stack.pop();

			for (var key in next.target) {
				var prefixed_key = !is_empty(next.prefix) ? next.prefix + '.' + key : key;

				var value = next.target[key];
				var value_type = typeof(value);

				if (value_type === 'string' || value_type === 'number' || value_type === 'boolean') {
					var regexp = new RegExp('\\${' + prefixed_key + '}', 'g');
					processed_template = processed_template.replace(regexp, value);
				} else if (value_type === 'object') {
					object_stack.push({
						prefix: prefixed_key,
						target: value
					});
				}
			}
		}

		return processed_template;
	}
};

manager.common = common;
})();
