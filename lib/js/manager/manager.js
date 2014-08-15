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

window.is_empty = function (value) {
    return !is_set(value) || value.length == 0;
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

function update_lh_miss_chance(passed_event) {
    var actual_event = window.event ? event : passed_event;

    switch (actual_event.keyCode) {
        case 10: // LF
        case 13: // CR
            render();
            break;
    }
}

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
    load_minions();
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

            success: function (loaded_champ) {
                manager.log('Loaded champion: ' + key);

                // Default gold
                loaded_champ['gold'] = 475;

                // Default level
                loaded_champ['level'] = 0;

                var abilities = loaded_champ['abilities'];
                for (var a in abilities) {
                    var ability = abilities[a];
                    ability['level'] = 0;
                }

                manager.champions[key] = loaded_champ;
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

function weak_champion_clone() {
    return {
        name: manager.champion['name'],
        level: manager.champion['level'],
        gold: manager.champion['gold'],
        stats: {
            cooldown_reduction: 0,
            armor_ignored: 0,
            magic_resist_ignored: 0,
            ability_power: 0
        },
        abilities: manager.common.clone(manager.champion['abilities']),
        items: [],
        effects: []
    }
}

function scale_champion_to_level(champion) {
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
}

function apply_item(champion, item) {
    var champion_stats = champion['stats'];

    // Process item stat modifiers first
    var item_stats = item['stats'];

    for (var stat in item_stats) {
        var value = item_stats[stat];
        champion_stats[stat] += value;
    }

    // Does it have a gold cost?
    if (is_set(item['cost'])) {
        champion['gold'] -= item['cost'];
    }

    // Process effects second
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
}

function apply_champion_items(champion) {
    var items = champion['items'];

    for (var i in items) {
        var item = items[i];
        apply_item(champion, item);
    }
}

function scale_champion_abilities(champion) {
    var cooldown_reduction = champion['stats']['cooldown_reduction'];
    var abilities = champion['abilities'];
    var scope = {
        champion: champion
    };

    for (var a in abilities) {
        var ability = abilities[a];
        var ability_level = ability['level'];

        var calculated_ability = {
            name: ability['name'],
            level: ability_level,
            max_level: ability['max_level'],
            info: ability['info']
        };

        scope.ability = manager.common.clone(ability);
        scope.ability['level_magnitude'] = ability_level - 1;

        // Calc range if set
        var base_range = ability['range'];
        if (is_set(base_range)) {
            calculated_ability['range'] = stat_eval(base_range, scope);
        }

        // Calc mana cost if set
        var base_mana_cost = ability['mana_cost'];
        if (is_set(base_mana_cost)) {
            calculated_ability['mana_cost'] = stat_eval(base_mana_cost, scope);
        }

        // Figure out the ability cooldown - this takes into consideration the champions cdr
        var base_cdr = ability['cooldown'];
        if (is_set(base_cdr)) {
            var cooldown = stat_eval(base_cdr, scope);
            cooldown -= cooldown * cooldown_reduction / 100;

            calculated_ability['cooldown'] = cooldown.toFixed(1);
        }

        // Does the ability have a passive effect?
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

        // Does the ability have an active effect?
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

        abilities[a] = calculated_ability;
    }
}

manager.MINIONS = {
    lane_melee: {
        name: "Melee Lane Minion",
        gold: "19 + game_time / 6",
        neutral: false,
        per_respawn: 3,
        spawn_time: "90",
        respawn_time: "30",
        experience: "58.88"
    },

    lane_caster: {
        name: "Caster Lane Minion",
        gold: "14 + game_time / 6",
        neutral: false,
        per_respawn: 3,
        spawn_time: "90",
        respawn_time: "30",
        experience: "29.44"
    },

    lane_siege: {
        name: "Lane Siege Minion",
        gold: "40 + game_time / 3",
        neutral: false,
        per_respawn: 1,
        spawn_time: "150",
        respawn_time: "game_time < 1800 ? 90 : 60",
        experience: "92"
    }
};

function load_minions() {
    for (var m in manager.MINIONS) {
        var minion = manager.MINIONS[m];

        minion['gold'] = gen_eval(['game_time'], minion['gold']);
        minion['experience'] = gen_eval(['game_time'], minion['experience']);
        minion['spawn_time'] = gen_eval(['game_time'], minion['spawn_time']);
        minion['respawn_time'] = gen_eval(['game_time'], minion['respawn_time']);
    }
}

function calculate_tgt(champion) {
    var exp_needed = 0;
    var gold = champion['gold'];

    var lh_miss_chance_elem = $('#tgt_lh_miss_chance');
    var lh_miss_chance;

    try {
        lh_miss_chance = parseInt(lh_miss_chance_elem.val());

        if (isNaN(lh_miss_chance) || lh_miss_chance < 0 || lh_miss_chance > 100) {
            lh_miss_chance_elem.val('0');
            lh_miss_chance = 0;
        }
    } catch (exception) {
        manager.log(exception);
    }

    for (var l = champion['level']; l > 0; l--) {
        exp_needed += 180 + l * 100;
    }

    var spawns_ot = {};
    for (var m in manager.MINIONS) {
        spawns_ot[m] = 0;
    }

    var miss_counter = 0;
    var game_time = 0;
    var exp = 0;

    while (gold < 0 || exp - exp_needed < 0) {
        // Advance game time in 30 second intervals
        game_time += 30;

        var spawns = {};
        for (var m in manager.MINIONS) {
            var minion = manager.MINIONS[m];
            var spawn_time = minion.spawn_time(game_time);

            if (game_time >= spawn_time) {
                var minion_time = game_time - spawn_time;
                var respawn_time = minion.respawn_time(game_time);

                if (minion_time % respawn_time == 0) {
                    var current = get_or(spawns[m], 0);

                    manager.log('At game time: ' + game_time + ' - Spawning ' + (current + minion.per_respawn) + ' ' + m + ' minions.');
                    spawns[m] = current + minion.per_respawn;
                }
            }
        }

        for (var m in spawns) {
            // What are we spawning and how many of them are there?
            var minion = manager.MINIONS[m];

            // Figure out exp and gold for this spawn set
            var gold_per_spawn = minion.gold(game_time);
            var exp_per_spawn = minion.experience(game_time);

            for (var num_spawned = spawns[m]; num_spawned > 0; num_spawned--) {
                miss_counter += lh_miss_chance;

                // Record our global state changes if we got the last hit
                if (miss_counter < 100) {
                    // Another kill overall for this minion type
                    spawns_ot[m]++;
                    manager.log('add');

                    gold += gold_per_spawn;
                    exp += exp_per_spawn;
                } else {
                    miss_counter -= 100;
                }
            }
        }
    }

    for (var m in spawns_ot) {
        var num_spawned = get_or(spawns_ot[m], 0);
        $('#num_' + m).html(num_spawned);
    }

    $('#tgt_required_min').html((game_time / 60|0) + ' Minutes');
    $('#tgt_required_sec').html((game_time % 60) + ' Seconds');
    $('#champion_gold').html(gold);
}

// Loads the champion and does calculations to create a presentation model
function get_champion() {
    var champion = weak_champion_clone();

    try {
        manager.change_manager.walk(function (changes) {
            for (var i in changes) {
                apply_change(changes[i], champion);
            }
        });

        scale_champion_to_level(champion);
        apply_champion_items(champion);
        scale_champion_abilities(champion);
    } catch (exception) {
        manager.log(exception);
    }

    return champion;
}

function gen_eval(arguments, body) {
    var func = '(function() { var generated = function(';

    var first_arg = true;
    for (var i in arguments) {
        var argument = arguments[i];

        if (first_arg) {
            func += argument;
        } else {
            func += ', ' + argument;
        }
    }

    func += ') { return ' + body + '; }; return generated; })();';

    var generated = null;

    with ({}) {
        generated = eval(func);
    }

    return generated;
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
    manager.champion = manager.champions[selected];
    manager.change_manager.reset();

    render();
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

    calculate_tgt(champion);

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

            // Special case for Lifesteal
            case 'lifesteal':
                var ls = stats[stat];
                var tms = stats['attack_damage'] * ls / 100;
                $('#champion_' + stat).html(ls + '% - On Basic Attack: ' + tms);
                break;

            // Stats represented as percentages
            case 'cooldown_reduction':
            case 'armor_ignored':
            case 'magic_resist_ignored':
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
        var level = ability['level'];
        var max_level = ability['max_level'];
        var is_special_ability = max_level == 0;

        var render_scope = {
            key: ability_key,
            name: ability['name'],
            level: (is_special_ability ? null : level),
            can_add_level: (level < max_level),
            info: 'Ability not known yet.',
            range: '',
            mana_cost: '',
            passive: '',
            cooldown: '',
            active: ''
        };

        if (level > 0 || is_special_ability) {
            render_scope['info'] = get_or(ability['info'], '');
            render_scope['range'] = get_or(ability['range'], '');
            render_scope['mana_cost'] = get_or(ability['mana_cost'], '');
            render_scope['cooldown'] = get_or(ability['cooldown'], '');

            if (is_set(ability['passive'])) {
                render_scope.passive = render_effect(ability['passive'], 'Passive');
            }

            if (is_set(ability['active'])) {
                render_scope.active = render_effect(ability['active'], 'Active');
            }
        }

        abilities_html += manager.common.process_template(manager.templates.ability, render_scope);
    }

    $('#abilities_table_pane').html(abilities_html);
}

function render_effect(effect, type) {
    var effects_html = '';

    var stats = effect['stats'];
    for (var stat in stats) {
        effects_html += '<tr><td>' + stat + '</td><td>' + stats[stat] + '</td></tr>';
    }

    return manager.common.process_template(manager.templates.effect, {
        type: type,
        name: effect['name'],
        unique: effect['unique'],
        info: effect['info'],
        effects: effects_html
    });
}

function render_items(champion) {
    var html = '';

    for (var i in champion.items) {
        var item = champion.items[i];

        var stats = item['stats'];
        var stats_html = '';

        for (var stat in item['stats']) {
            stats_html += '<tr><td>' + stat + '</td><td>' + stats[stat] + '</td></tr>';
        }

        var effects = item['effects'];
        var effects_html = '';

        for (var ei in effects) {
            var effect = effects[ei];
            var type = effect['type'].toLowerCase();

            effects_html += render_effect(effect, type == 'passive' ? 'Passive' : 'Active');
        }

        html += manager.common.process_template(manager.templates.item, {
            'key': item['key'],
            'name': item['name'],
            'cost': item['cost'],
            'sell_value': item['sell_value'],
            'stats': stats_html,
            'effects': effects_html
        });
    }

    $('#items_table_pane').html(html);
}

function update_level() {
    manager.change_manager.stage(function(t) {
        try {
            var level = parseInt($('#champion_level').val());

            t.add('tav_mod', {
                specifier: '$.level',
                value: level
            });
            t.commit();
        } catch (exception) {
            manager.log(exception);
        }
    });

    render();
}

function add_ability_level(ability_key, level) {
    var champion = get_champion();
    var abilities = champion['abilities'];

    var champion_level = champion['level'];
    var required_level = 0;

    for (var a in abilities) {
        var ability = abilities[a];
        required_level += ability['level'];
    }

    manager.change_manager.stage(function(t) {
        t.add('tav_mod', {
            specifier: '$.abilities.' + ability_key + '.level',
            value: level + 1
        });

        if (required_level > champion_level) {
            t.add('tav_mod', {
                specifier: '$.level',
                value: champion_level + 1
            });
        }

        t.commit();
    });

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

    manager.modal.raise_input(html,
        function (value_dict) {
            var item = manager.items[value_dict['item']];
            item = manager.common.clone(item);

            manager.change_manager.stage(function(t) {
                t.add('add_to_array', {
                    specifier: "$.items",
                    value: item
                });
                t.commit();
            });

            render();
        });
}

function remove_item(name) {
    manager.change_manager.stage(function(t) {
        t.add('remove', {
            specifier: "$.items[?(@['key']=='" + name + "')]"
        });
        t.commit();
    });

    render();
}

function apply_change(change, champion) {
    switch (change.type) {
        case 'add_to_array':
            add_to_array(change.value, champion);
            break;

        case 'tav_mod':
            apply_tav_change(change.value, champion);
            break;

        case 'remove':
            remove_by_path(change.value, champion);
            break;

        default:
            manager.log('Unknown change type; ' + change.type);
    }
}

function render_chart() {
    champion = weak_champion_clone();

    try {
        manager.change_manager.walk(function (changes) {
            for (var i in changes) {
                apply_change(changes[i], champion);
            }

            scale_champion_to_level(champion);
            apply_champion_items(champion);
            scale_champion_abilities(champion);
        });
    } catch (exception) {
        manager.log(exception);
    }

    var ctx = $('#champion_chart').get(0).getContext("2d");
}