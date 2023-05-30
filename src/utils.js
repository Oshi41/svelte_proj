const ms = 1,
	s = 1000,
	min = 60 * s,
	h = 60 * min,
	d = 24 * h,
	w = 7 * d;
export const mls = { ms, s, min, h, d, w };
const formats = [
	['yyyy', 'getUTCFullYear'],
	['MM', 'getUTCMonth', { pad: 'start' }],
	['dd', 'getUTCDate', { pad: 'start' }],
	['HH', 'getUTCHours', { pad: 'start' }],
	['hh', (x) => x.getUTCHours() % 12, { pad: 'start' }],
	['mm', 'getUTCMinutes', { pad: 'start' }],
	['ss', 'getUTCSeconds', { pad: 'start' }],
	['tt', (x) => (x.getUTCHours() >= 12 ? 'PM' : 'AM')],
	['zzz', 'getUTCMilliseconds', { pad: 'start' }]
];
export const str2dur = (txt) => {
	let match,
		result = 0,
		regex = /(\d+)\s*(y|mo|w|d|h|min|s|ms)?/g;
	while ((match = regex.exec(txt))) {
		const [, num, unit] = match;
		result += parseInt(num) * mls[unit || 'ms'];
	}
	return result;
};
export const dur2str = (duration, max_time = w, min_time = s) => {
	duration = duration || 0;
	let time_parts = Object.entries(mls).sort((a, b) => a[1] - b[1]).reverse();
	if (time_parts.every(x=> x[1] != max_time))
		max_time = w;
	if (time_parts.every(x=> x[1] != min_time))
		min_time = s;
	time_parts = time_parts.filter(([, x])=> min_time <= x && x <= max_time);
	let parts = [];
	for (let [unit, mls] of time_parts) {
		if (duration < mls) continue;
		const num = Math.floor(duration / mls);
		parts.push(`${num}${unit}`);
		duration -= mls * num;
	}
	return parts.join(' ') || '0s';
};

export const q2str = (query) => {
	let parts = [],
		types = ['function', 'object'];
	for (let [key, val] of Object.entries(query || {})) {
		if (types.includes(typeof val)) val = JSON.stringify(val);
		parts.push(key + '=' + val);
	}
	return parts.length && '?' + parts.join('&');
};

export const date_format = (date, f_txt) => {
	if (!(date instanceof Date)) return '';
	for (let [key, name_or_func, { pad } = {}] of formats) {
		let replace =
			(typeof name_or_func == 'string' ? date[name_or_func]() : name_or_func(date)) + '';
		if (pad) {
			for (let char of key.slice(1)) {
				if (char != key[0]) {
					throw new Error('Wrong format description! Pad values must use the same char');
				}
			}
			if (!['start', 'end'].includes(pad)) pad = 'start';
			while (key.length) {
				let rep = replace[pad == 'start' ? 'padStart' : 'padEnd'](key.length, 0);
				f_txt = f_txt.replace(new RegExp(key), rep);
				key = key.slice(1);
			}
		} else {
			f_txt = f_txt.replace(new RegExp(key), replace);
		}
	}
	return f_txt;
};

export const clamp = (min, val, max) => (val < min ? min : val > max ? max : val);

export const sleep = (mls) => new Promise((resolve) => setTimeout(() => resolve(true), mls));

/**
 * @param source {any}
 * @param prop {any}
 * @param paths {Array<string>}
 * @param opts
 * @return {any}
 */
export const set = (source, prop, paths, opts = {}) => {
	if (!source || !prop || !paths?.length) return source;

	let last_path = paths.pop();

	let temp = source;
	for (let key of paths) {
		if (!temp.hasOwnProperty(key)) temp[key] = {};
		temp = temp[key];
	}

	temp[last_path] = prop;
	return source;
};

export const select_recursive_obj = (obj, get_children_fn) => {
	return [
		...Object.values(obj),
		...Object.values(get_children_fn(obj) || {}).flatMap((x) =>
			select_recursive_obj(x, get_children_fn)
		)
	];
};
