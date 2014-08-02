/*
	Constants
*/
window.get_or = function (value, or) {
	return is_set(value) ? value : or;
}

window.is_set = function (value) {
	return value !== null && value !== undefined;
}

window.is_not_set = function (value) {
	return !is_set(value);
}

window.parseBoolean = function (boolean_str) {
	if (is_set(boolean_str) && boolean_str.length > 0) {
		switch (boolean_str) {
			case 'false':
				return false;

			case 'true':
				return true;
		}
	}

	throw 'Unable to parse boolean.';
}

window.manager = (function () {
	return {
		log: function(msg, level) {
			if (console != null) {
				console.log(msg);
			}
		},

		libraries: [
			'/lib/js/manager/common.lib.js',
			'/lib/js/manager/json.lib.js',
			'/lib/js/manager/html5_localstore.lib.js',
			'/lib/js/manager/changes.lib.js',
			'/lib/js/manager/modal.lib.js'
		],

		include: function (script_ref) {
			$.ajax({
				url: script_ref,
				async: false,
				dataType: 'text',

				success: function (data) {
					manager.log('Loading module: ' + script_ref);

					try {
						eval(data);
					} catch (exception) {
						manager.log(exception);
					}
				},

				error: function (err) {
					manager.log(err);
				}
			});
		}
	};
})();

function on_key_down(passed_event) {
	var actual_event = window.event ? event : passed_event;

	if (actual_event.ctrlKey) {
		// ctrl + ...

		switch (actual_event.keyCode) {
			case 27: //ESC
				manager.modal.clear();
				break;

			case 77: //M
				var confirmed = confirm('Warning! This will reset all local data. Are you sure?');

				if (confirmed) {
					reset();
				}
				break;

			case 89: //Y
				redo();
				break;

			case 90: //Z
				undo();
				break;
		}
	} else {
		// No meta keys

		switch (actual_event.keyCode) {
			case 27: //ESC
				manager.modal.clear();
				break;
		}
	}
}

function init() {
	document.onkeydown = on_key_down;

	var info_element = $('#info_pane');
	info_element.removeClass('hidden');

	load_libraries();
	load_templates();
	load_champions();
	load_items();

	info_element.addClass('hidden');
}

function load_libraries() {
	var info_element = $('#info_pane');

	manager.log('Loading libraries.');

	for (var i in manager.libraries) {
		var lib_path = manager.libraries[i];

		info_element.html('<p>Loading library: ' + lib_path + '</p>');
		manager.include(lib_path);
	}
}

function load_templates() {
	manager.templates = {};

	manager.log('Loading templates.');

	$.ajax({
		url: './templates/index.json',
		async: false,

		success: load_templates_from_index,
		error: ajax_error
	});
}

function load_templates_from_index(index) {
	var info_element = $('#info_pane');
	var templates = index['templates'];

	for (var i in templates) {
		var template = templates[i];
		var key = /(.*)(?:.template.html)/.exec(template)[1];

		info_element.html('<p>Loading ' + template + '</p>');

		$.ajax({
			url: './templates/' + template,
			async: false,

			success: function (data) {
				manager.log('Loaded template: ' + key);
				manager.templates[key] = data;
			},

			error: ajax_error
		});
	}
}

function load_champions() {
	manager.champions = {};

	manager.log('Loading champions.');

	$.ajax({
		url: './lib/champions/index.json',
		async: false,

		success: load_champions_from_index,
		error: ajax_error
	});
}

function load_champions_from_index(index) {
	var info_element = $('#info_pane');
	var champions = index['champions']

	for (var i in champions) {
		var champion = champions[i];
		var key = /(.*)(?:.json)/.exec(champion)[1];

		manager.log('Loading champion: ' + champion);
		info_element.html('<p>Loading ' + champion + '</p>');

		$.ajax({
			url: './lib/champions/' + champion,
			async: false,

			success: function (data) {
				manager.log('Loaded champion: ' + key);
				manager.champions[key] = data;
			},

			error: ajax_error
		});
	}

	var champion_selector = $('#selected_champion');
	var output = ['<option value=""></option>'];

	for (var key in manager.champions) {
		var champion = manager.champions[key];
		output.push('<option value="' + key + '">' + champion['name'] + '</option>');
	}

	champion_selector.html(output.join('\n'));
}

function load_items() {
	manager.items = [];

	manager.log('Loading items.');

	$.ajax({
		url: './lib/items/index.json',
		async: false,

		success: load_items_from_index,
		error: ajax_error
	});
}

function ajax_error(data, error, msg) {
	manager.log(error + " caught during AJAX call. Reason: " + msg);
}

function load_items_from_index(index) {
	var info_element = $('#info_pane');
	var items = index['items']

	for (var i in items) {
		var item = items[i];
		var key = /(.*)(?:.json)/.exec(item)[1];

		manager.log('Loading item: ' + item);
		info_element.html('<p>Loading ' + item + '</p>');

		$.ajax({
			url: './lib/items/' + item,
			async: false,

			success: function (data) {
				manager.log('Loaded item: ' + key);

				// Set a key so we can easily reference it with JSONPath
				data['key'] = key;
				manager.items[key] = data;
			},

			error: ajax_error
		});
	}
}

function save() {
	manager.change_manager.trim_at_bookmark();
	manager.change_manager.save();
}

function undo() {
	manager.change_manager.undo();
	render();
}

function redo() {
	manager.change_manager.redo();
	render();
}

function reset() {
	manager.change_manager.reset();
	render();
}

function remove_by_path(change, champion) {
	var target = manager.json.locate(change.specifier, champion);

	if (is_set(target)) {
		target.remove();
	} else {
		manager.common.notify.error('Unable to remove: ' + JSON.stringify(change));
	}
}

function add_to_array(change, champion) {
	var target = manager.json.locate(change.specifier, champion);

	if (is_set(target)) {
		var array = target.get();
		target.set(array.concat(change.value));
	} else {
		manager.common.notify.error('Unable to update: ' + JSON.stringify(change));
	}
}

function apply_tav_change(change, champion) {
	var target = manager.json.locate(change.specifier, champion);

	if (is_set(target)) {
		target.set(change.value);
	} else {
		manager.common.notify.error('Unable to update: ' + JSON.stringify(change));
	}
}

function format_unit(unit) {
	var value_html = '' + unit.value;

	if (unit.shorthand != null && unit.shorthand.length > 0) {
		value_html += '<span class="unit_shorthand">' + unit.shorthand + '</span>';
	}

	return value_html;
}

// Loads the champion and does calculations to create a presentation model
function get_champion() {
	var champion = {
		name: manager.champion['name'],
		level: manager.champion['level'],
		stats: {
			ability_power: 0
		},
		abilities: {},
		items: [],
		effects: []
	};

	var changes = manager.changes;

	if (manager.change_manager.has_changes()) {
		var bookmark = manager.change_manager.bookmark();
		var remaining = manager.change_manager.has_bookmark() ?
			manager.change_manager.bookmark() : manager.change_manager.num_changes();

		manager.change_manager.walk_changeset(function (id, change) {
			if (remaining-- == 0) {
				return false;
			}

			switch (change.type) {
				case 'add_to_array':
					add_to_array(change, champion);
					break;

				case 'tav_mod':
					apply_tav_change(change, champion);
					break;

				case 'remove':
					remove_by_path(change, champion);
					break;

				default:
					manager.log('Unknown change type; ' + change.type);
			}

		});
	}

	// Apply scalings
	var champion_stats = champion['stats'];
	var values = manager.champion['stats']['values'];
	var scalings = manager.champion['stats']['scalings'];

	for (var stat in values) {
		switch (stat) {
			// Percent scaling stats
			case 'movement_speed':
			case 'attack_speed':
				champion_stats[stat] = scale_percentage_stat(values[stat], scalings[stat], champion.level);
				break;

			// Flat scaling stats
			default:
				champion_stats[stat] = scale_flat_stat(values[stat], scalings[stat], champion.level);
		}
	}

	// Apply items
	var items = champion['items'];

	for (var i in items) {
		var item = items[i];
		var item_stats = item['stats']

		for (var stat in item_stats) {
			var value = item_stats[stat];
			champion_stats[stat] += value;
		}

		var effects = item['effects'];

		for (var key in effects) {
			var effect = effects[key];
			var process_effect = !effect['unique'];

			if (!is_set(champion.effects[key])) {
				champion.effects[key] = effect;
				process_effect = true;
			}

			if (process_effect) {
				var effect_stats = effect['stats'];

				for (var stat in effect_stats) {
					champion_stats[stat] += effect_stats[stat];
				}
			}
		}

		champion.items[i] = item;
	}

	// Handle abilities
	var abilities = manager.champion['abilities'];
	var scope = {
		champion: champion
	};

	for (var a in abilities) {
		var ability = abilities[a];

		if (!is_set(ability.level)) {
			ability.level = ability.max_level - 1;
		}

		scope.ability = ability;

		var calculated_ability = {
			name: ability['name'],
			level: ability['level'],
			info: ability['info']
		};

		calculated_ability['range'] = stat_eval(ability['range'], scope);
		calculated_ability['mana_cost'] = stat_eval(ability['mana_cost'], scope);
		calculated_ability['cooldown'] = stat_eval(ability['cooldown'], scope);

		var passive = ability['passive'];
		if (is_set(passive)) {
			var ability_stats = passive['stats'];
			var cstats = {};

			for (var as in ability_stats) {
				var stat = ability_stats[as];
				cstats[as] = stat_eval(stat, scope);
			}

			calculated_ability['passive'] = {
				stats: cstats,
				info: passive['info']
			};
		}

		var active = ability['active'];
		if (is_set(active)) {
			var ability_stats = active['stats'];
			var cstats = {};

			for (var as in ability_stats) {
				var stat = ability_stats[as];
				cstats[as] = stat_eval(stat, scope);
			}

			calculated_ability['active'] = {
				stats: cstats,
				info: active['info']
			};
		}

		champion.abilities[a] = calculated_ability;
	}

	return champion;
}

function stat_eval(stat, scope) {
	var cloned_scope = manager.common.clone(scope);
	cloned_scope.retval = null;
	cloned_scope.exec = '(function () { return ' + stat + ';})();';

	with (cloned_scope) {
		var retval = eval(cloned_scope.exec);
		cloned_scope.retval = retval;
	}

	return cloned_scope.retval;
}

/*
	Rendering functions
*/
function load_champion() {
	var selected = $('#selected_champion').val();

	if (is_set(selected)) {
		$.ajax({
			url: './lib/champions/' + selected + '.json',
			async: false,

			success: function (champion) {
				// Set some sane defaults
				champion['items'] = [];
				champion['runes'] = [];
				champion['masteries'] = [];

				// Set the champ in the manager and then render it
				manager.champion = champion;
				render();
			},

			error: ajax_error
		});
	}
}

function render() {
	if (is_set(manager.champion)) {
		var champion = get_champion();

		manager.log('Rendering champion');
		render_champion(champion);

		manager.log('Rendering items');
		render_items(champion);
	}
}

function scale_flat_stat(value, scaling, level) {
	var new_value = value;

	if (is_set(scaling)) {
		for (var i = 0; i < level; i++) {
			new_value += scaling;
		}
	}

	return new_value;
}

function scale_percentage_stat(value, scaling, level) {
	var new_value = value;

	if (is_set(scaling)) {
		for (var i = 0; i < level; i++) {
			new_value += value * scaling / 100;
		}
	}

	return new_value;
}

function render_champion(champion) {
	$('#champion_name').html(champion['name']);
	$('#champion_level option[value=' + champion['level'] + ']').prop('selected', true);

	render_champion_stats(champion['stats']);
	render_champion_abilities(champion['abilities']);
}

function render_champion_stats(stats) {
	for (var stat in stats) {
		switch (stat) {
			// String value enum for type of attack
			case 'attack_type':
				if (stats[stat].toLowerCase() == 'ranged') {
					$('#champion_attack_type').html('Ranged');
				} else {
					$('#champion_attack_type').html('Melee');
				}

				break;

			// Stats represented as percentages
			case 'lifesteal':
				var ls = stats[stat];
				var tms = stats['attack_damage'] * ls / 100;
				$('#champion_' + stat).html(ls + '% - On Basic Attack: ' + tms);
				break;

			case 'spellvamp':
				$('#champion_' + stat).html(stats[stat] + '%');
				break;

			// Stats represented with 3 decimal place precision
			case 'attack_speed':
				$('#champion_' + stat).html(stats[stat].toFixed(3) + ' per second');
				break;

			// Stats represented with 2 decimal place precision
			case 'health_regen':
			case 'mana_regen':
				$('#champion_' + stat).html(
					stats[stat].toFixed(2) + ' / 5s (' + (stats[stat] / 5).toFixed(2) + ' per second)');
				break;

			// Stats represented with 0 decimal place precision (integers)
			default:
				$('#champion_' + stat).html(stats[stat].toFixed(0));
		}
	}
}

function render_champion_abilities(abilities) {
	var abilities_html = '';

	for (var ability_key in abilities) {
		var ability = abilities[ability_key];

		var render_scope = {
			name: ability['name'],
			level: ability['level'] + 1,
			info: get_or(ability['info'], ''),
			range: get_or(ability['range'], ''),
			mana_cost: get_or(ability['mana_cost'], ''),
			cooldown: get_or(ability['cooldown'], ''),
			passive: '',
			active: ''
		};

		if (is_set(ability['passive'])) {
			render_scope.passive = render_ability_effects(ability['passive'], 'Passive');
		}

		if (is_set(ability['active'])) {
			render_scope.active = render_ability_effects(ability['active'], 'Active');
		}

		abilities_html += manager.common.process_template(manager.templates.ability, render_scope);
	}

	$('#abilities_table_pane').html(abilities_html);
}

function render_ability_effects(effect, type) {
	var effects_html = '';

	var stats = effect['stats'];
	for (var stat in stats) {
		effects_html += '<tr><td>' + stat + '</td><td>' + stats[stat] + '</td></tr>';
	}

	return manager.common.process_template(manager.templates.ability_effect, {
		type: type,
		info: effect['info'],
		effects: effects_html
	});
}

function render_items(champion) {
	var html = '';

	for (var i in champion.items) {
		var item = champion.items[i];

		var stats = item['stats'];
		var stat_rows_html = '';

		for (var stat in item['stats']) {
			stat_rows_html += '<tr><td class="name">' + stat + '</td>';
			stat_rows_html += '<td class="value">' + stats[stat] + '</td></tr>';
		}

		var effects = item['effects'];
		var effect_rows_html = '';

		for (var ei in effects) {
			var effect = effects[ei];
			var type = effect['type'].toLowerCase();

			var name = effect['unique'] ? 'UNIQUE' : '';

			if (type == 'passive') {
				name += ' Passive';
			} else {
				name += ' Active';
			}

			if (is_set(effect['name'])) {
				name += ' - ' + effect['name']
			}

			effect_rows_html += '<tr><td class="name">' + name + '</td><td /><td /></tr>' +
			'<tr><td>' + effect['info'] + '</td></tr><tr><td><table><tbody>';

			var effect_stats = effect['stats'];

			for (var key in effect_stats) {
				var effect_stat = effect_stats[key];

				effect_rows_html += '<tr><td /><td class="name">' + key + ':</td>';
				effect_rows_html += '<td class="value">' + effect_stat + '</td></tr>';
			}

			effect_rows_html += '</tbody></table></td></tr>';
		}

		html += manager.common.process_template(manager.templates.item, {
			'key': item['key'],
			'name': item['name'],
			'cost': item['cost'],
			'sell_value': item['sell_value'],
			'stat_rows': stat_rows_html,
			'effect_rows': effect_rows_html
		});
	}

	$('#items_table_pane').html(html);
}

function update_level() {
	manager.change_manager.add(
		'$.level',
		'tav_mod',
		parseInt($('#champion_level').val()));

	render();
}

// Item list cache :)
var item_list_html;

function add_new_item() {
	var template = manager.templates.add_item;

	if (!is_set(item_list_html)) {
		item_list_html = '';

		for (var key in manager.items) {
			var item = manager.items[key];

			item_list_html += '<option value="' + key + '">' + item.name + '</option>\n';
		}
	}

	var html = manager.common.process_template(template, {
		'item_options': item_list_html
	});

	manager.modal.raise(html,
		function (value_dict) {
			var item = manager.common.clone(manager.items[value_dict['item']]);

			manager.change_manager.add(
				"$.items",
				'add_to_array',
				item);

			render();
		});
}

function remove_item(name) {
	manager.change_manager.add(
		"$.items[?(@['key']=='" + name + "')]",
		'remove');

	render();
}