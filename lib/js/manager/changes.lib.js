(function () {
var CHANGESET_COMMIT_TYPE = '_changeset_commit';

var change_manager = {

	DEFAULT_DRIVER: 'html5_localstore',

	data: {
		tail: null,
		head: null,
		bookmark: null,

		deltas: {}
	},

	num_changes: function () {
		return manager.common.dict_len(this.data.deltas);
	},

	bookmark: function() {
		return this.data.bookmark;
	},

	has_bookmark: function() {
		return is_set(this.data.bookmark);
	},

	has_changes: function() {
		return is_set(this.data.head);
	},

	reset: function(driver_type) {
		var driver_name = this.DEFAULT_DRIVER;

		if (is_set(driver_type)) {
			manager.common.notify.warn('Driver support for saving changes not yet supported.');
		}

		this.data = {
			tail: null,
			head: null,
			bookmark: null,

			deltas: {}
		};

		var datastore = manager[driver_name];
		datastore.save('changes', this.data);

		manager.common.notify.success('Changes reset');
	},

	load: function (driver_type) {
		var driver_name = this.DEFAULT_DRIVER;

		if (is_set(driver_type)) {
			manager.common.notify.warn('Driver support for loading changes not yet supported.');
		}

		var datastore = manager[driver_name];

		try {
			var saved_changes = datastore.get('changes');

			if (is_set(saved_changes)) {
				this.data = saved_changes;
			}
		} catch (exception) {
			manager.log('Falure: ' + exception);
			manager.common.notify.warn('Failed to load saved data. Cleaning.');
			datastore.remove('changes');
		}
	},

	save: function (driver_type) {
		var driver_name = this.DEFAULT_DRIVER;

		if (is_set(driver_type)) {
			manager.common.notify.warn('Driver support for saving changes not yet supported.');
		}

		var datastore = manager[driver_name];
		datastore.save('changes', this.data);

		manager.common.notify.success('Changes saved');
	},

	stage: function(delegate) {
		(function (outer) {
			delegate({
				changes: [],

				add: function(type, value) {
					this.changes.push({
						type: type,
						value: value
					});
				},

				commit: function() {
					outer.add(CHANGESET_COMMIT_TYPE, this.changes);
				}
			});
		}(this));
	},

	add: function(type, value) {
		if (this.has_bookmark()) {
			this.trim_at_bookmark();
		}

		var new_change_id = manager.common.uuid4();

		this.data.deltas[new_change_id] = {
			id: new_change_id,
			next: null,
			type: type,
			value: value
		};

		if (this.has_changes()) {
			this.data.deltas[this.data.tail].next = new_change_id;
		} else {
			this.data.head = new_change_id;
		}

		this.data.tail = new_change_id;
		this.save();
	},

	redo: function() {
		if (this.has_bookmark()) {
			this.data.bookmark += 1;

			if (this.data.bookmark == this.num_changes()) {
				this.data.bookmark = null;
			}

			manager.common.notify.success('Redoing');
		}
	},

	undo: function () {
		if (this.has_changes()) {
			if (this.has_bookmark()) {
				if (this.data.bookmark > 0) {
					this.data.bookmark--;
					manager.common.notify.success('Undoing');
				}
			} else {
				this.data.bookmark = this.num_changes() - 1;
				manager.common.notify.success('Undoing');
			}
		}
	},

	walk: function (delegate) {
		var remaining = this.has_bookmark() ? this.bookmark() : this.num_changes();

		if (remaining > 0) {
			this.walk_changes(function (id, change) {
				delegate(change.value);
				remaining--;

				return remaining == 0;
			});
		}
	},

	walk_changes: function (delegate) {
		if (this.has_changes()) {
			var next_change = this.data.head;

			while (is_set(next_change)) {
				var change = this.data.deltas[next_change];
				var key = next_change;

				next_change = change.next;
				if (get_or(delegate(key, change), false)) {
					break;
				}
			}
		}
	},

	trim_at_bookmark: function () {
		var remaining = this.data.bookmark;
		var self = this;

		this.walk_changes(function (key, change) {
			manager.log('Reading: ' + key + ' with remaining: ' + remaining);

			if (remaining > 1) {
				remaining--;
			} else if (remaining == 1) {
				remaining--;

				manager.log('Bookmarked at: ' + key);

				change.next = null;
				self.data.tail = key;
			} else {
				manager.log('Deleting: ' + key);
				delete self.data.deltas[key];
			}
		});

		if (this.num_changes() == 0) {
			this.data.head = null;
			this.data.tail = null;
		}

		this.data.bookmark = null;
	}
};

manager.change_manager = change_manager;
})();
