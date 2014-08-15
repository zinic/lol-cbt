(function () {
var modal = {
	active: {},

	_setup: function (html, on_save, on_close) {
		$(window).scroll(function () {
			var sheight = window.innerHeight;
			var swidth = window.innerWidth;

			$('#cover_pane').css({
				'top': window.pageYOffset + 'px'
			});

			$('#modal').css({
				'top': window.pageYOffset + sheight / 3,
				'left': window.pageXOffset + swidth / 2.5
			});
		});

		var sheight = window.innerHeight;
		var swidth = window.innerWidth;

		var cover_pane = $('#cover_pane');
		cover_pane.removeClass('hidden');
		cover_pane.css({
			height: sheight + 'px',
			width: swidth + 'px',
			top: window.pageYOffset + 'px'
		});

		var modal = $('#modal');
		modal.removeClass('hidden');
		modal.css({
			top: window.pageYOffset + sheight / 3,
			left: window.pageXOffset + swidth / 2.5
		});

		modal.html(html);

		this.active['on_save'] = on_save;
		this.active['on_close'] = on_close;
	},

	raise: function (html, on_close) {
		var rendered_content = manager.common.process_template(manager.templates.modal, {
			html: html
		});

		this._setup(rendered_content, null, on_close);
	},

	raise_input: function (form_html, on_save, on_close) {
		var rendered_content = manager.common.process_template(manager.templates.input_modal, {
			form_html: form_html,
			submit_name: "Commit"
		});

		this._setup(rendered_content, on_save, on_close);
	},

	get_form_json: function () {
		var modal_form = $('#modal_form').serializeArray();
		var simple_payload = {};

		for (var i in modal_form) {
			var entry = modal_form[i];
			var split_name = entry['name'].split('.');
			var target = simple_payload;

			var r = 0;

			while (r < split_name.length - 1) {
				var key_part = split_name[r];
				var next_target = target[key_part];

				if (!is_set(next_target)) {
					next_target = {};
					target[key_part] = next_target;
				}

				target = next_target;
				r += 1;
			}

			target[split_name[r]] = entry['value'];
		}

		return simple_payload;
	},

	submit: function () {
		var simple_payload = this.get_form_json();

		try {
			var on_save = this.active['on_save'];

			if (is_set(on_save)) {
				on_save(simple_payload);
			}
		} catch (exception) {
			manager.log(exception);
		} finally {
			this.clear();
		}
	},

	clear: function () {
		$('#cover_pane').addClass('hidden');
		$('#modal').addClass('hidden');

		$(window).unbind('scroll');

		try {
			var on_close = this.active['on_close'];

			if (is_set(on_close)) {
				on_close();
			}
		} catch (exception) {
			manager.log(exception);
		} finally {
			delete this.active['on_save'];
			delete this.active['on_close'];
		}
	}
};

manager.modal = modal;
})();
