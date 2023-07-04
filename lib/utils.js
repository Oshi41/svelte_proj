const ms = 1,
    s = 1000,
    min = 60 * s,
    h = 60 * min,
    d = 24 * h,
    w = 7 * d;
export const mls = {ms, s, min, h, d, w};
const formats = [
    ['yyyy', 'getUTCFullYear'],
    ['MM', 'getUTCMonth', {pad: 'start'}],
    ['dd', 'getUTCDate', {pad: 'start'}],
    ['HH', 'getUTCHours', {pad: 'start'}],
    ['hh', (x) => x.getUTCHours() % 12, {pad: 'start'}],
    ['mm', 'getUTCMinutes', {pad: 'start'}],
    ['ss', 'getUTCSeconds', {pad: 'start'}],
    ['tt', (x) => (x.getUTCHours() >= 12 ? 'PM' : 'AM')],
    ['zzz', 'getUTCMilliseconds', {pad: 'start'}]
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
    if (time_parts.every(x => x[1] != max_time))
        max_time = w;
    if (time_parts.every(x => x[1] != min_time))
        min_time = s;
    time_parts = time_parts.filter(([, x]) => min_time <= x && x <= max_time);
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
    return parts.length ? '?' + parts.join('&') : '';
};

export const str2q = (query = '') => query.substring(1).split('&')
    .filter(Boolean).map(x => x.split('='))
    .reduce((p, [k, v]) => Object.assign(p, {[k]: v}), {});

export const date_format = (date, f_txt) => {
    if (!(date instanceof Date)) return '';
    for (let [key, name_or_func, {pad} = {}] of formats) {
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

export const today = (is_utc = false) => {
    let now = new Date();
    return is_utc ? new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    )) : new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}

/**
 * @param source {any}
 * @param prop {any}
 * @param paths {Array<string>}
 * @param opts
 * @return {any}
 */
export const set = (source, prop, paths, {
    skip_falsey = true,
    treat_falsey_as_delete = false, only_change_props = false
} = {}) => {
    if (!source || !paths?.length) return source;

    let last_path = paths.pop();

    let temp = source;
    for (let key of paths) {
        if (!temp.hasOwnProperty(key)) { // Can't create property
            if (!only_change_props)
                return source;
            temp[key] = {};
        }
        temp = temp[key];
    }

    if (prop || !skip_falsey)
        temp[last_path] = prop;
    else if (!prop && treat_falsey_as_delete)
        delete temp[last_path];

    return source;
};

/**
 * @param source {any}
 * @param paths {Array<string>}
 * @return {any}
 */
export const get = (source, paths) => {
    if (!source || !paths?.length)
        return source;

    let temp = source;
    while (temp && paths.length)
        temp = source[paths.shift()];
    return temp;
};

export const pick = (src, paths, opts = undefined) => {
    if (typeof paths == 'string')
        paths = paths.split(' ');
    if (!Array.isArray(paths))
        return {};
    let res = {};
    for (let path of paths) {
        path = path.split('.');
        let prop = get(src, path);
        set(res, prop, path, opts);
    }
    return res;
}

/**
 * Find paths to current property
 * @param source {any}
 * @param prop {any}
 * @return {string[]}
 */
export const find_paths = (source, prop, eq_func = Object.is) => {
    for (let [key, val] of Object.entries(source)) {
        if (eq_func(val, prop))
            return [key];
    }

    for (let [key, val] of Object.entries(source).filter(([, v]) => typeof v == 'object')) {
        for (let child of Object.values(val).filter(x => typeof x == 'object')) {
            let arr = find_paths(child, prop);
            if (Array.isArray(arr))
                return [key, ...arr];
        }
    }
}

export const select_recursive = (arr, child_fn) => {
    let res = [];
    if (!arr?.length || !child_fn)
        return res;
    new Map().entries()
    arr = arr.filter(Boolean);
    res.push(...arr);
    res.push(...arr.flatMap(x => select_recursive(child_fn(x), child_fn)));
    return res;
};

export const select_recursive_obj = (obj, get_children_fn = Object.values()) => {
    return [
        ...Object.values(obj),
        ...Object.values(get_children_fn(obj) || {}).flatMap((x) =>
            select_recursive_obj(x, get_children_fn)
        )
    ];
};

export const is_store = ctx => {
    return typeof ctx?.subscribe == 'function';
};

const mongo_functions = {
    $push: (source, key, value) => {
        if (!source.hasOwnProperty(key))
            source[key] = [];
        if (!Array.isArray(source[key]))
            return console.debug('[$push] source should be an array', {source, key, value});
        if (!Array.isArray(value))
            return console.debug('[$push] value should be an array', {source, key, value});
        value.forEach(x => source[key].push(x));
    },
    $unset: (source, key, value) => {
        if (!source)
            return;
        for (let prop of Object.keys(value)) {
            delete source[prop];
        }
        return source;
    },
};

/**
 * Mutates object with mongo style
 * @param source {any} source obj
 * @param mutator {any} mongo mutator
 * @return {{}|any} result of mutation. Same instance!
 */
export const mongo_apply = (source, mutator) => {
    if (!source)
        source = {};
    if (!mutator)
        return source;
    if (typeof mutator != 'object')
        return Object.assign(source, mutator);

    for (let prop in mutator) {
        if (mongo_functions.hasOwnProperty(prop))
            mongo_functions[prop](source, prop, mutator[prop]);
        else
            Object.assign(source, {[prop]: mutator[prop]});
    }

    return source;
}

export const skip_fn = (fn, skip = 0) => (...args) => {
    if (skip > 0) {
        skip--;
    } else {
        fn(...args);
    }
}

/**
 * @param fn {Promise | function | Function<Promise>>}
 * @return {Promise}
 */
const promisify = fn => {
    if (typeof fn == 'function')
    {
        return new Promise((r, rej)=>{
           try {
               let res = fn();
               r(res);
           } catch (e) {
               rej(e);
           }
        });
    } else if (fn.then && fn.finally)
        return fn;
    else
        return new Promise(r=>r(fn));
}

/**
 * @param fn {Function | Function<Promise>}
 * @param timeout {number}
 * @return {Function & {cancel: ()=>void, force_fn: Function, is_running: ()=>boolean}}
 */
export const debounce = (fn, {timeout = 300} = {}) => {
    let t, promise;
    const is_running = () => !!promise;
    const cancel = () => clearTimeout(t);
    const finish = () => {
        clearTimeout(t);
        t = null;
        promise = null;
    };
    const force_fn = () => {
        if (is_running())
            return;
        cancel();
        promise = promisify(fn).catch(e => {
            throw e;
        }).finally(()=>finish);
    };
    const result = () => {
        if (is_running())
            return;
        cancel();
        t = setTimeout(()=>force_fn(), timeout);
    };
    Object.assign(result, {cancel, force_fn, is_running});
    return result;
};

/**
 * @return {Function & {is_outdated: ()=>boolean, invalidating: ()=>boolean, invalidate: ()=>void}}
 */
export const cached = (fn, {timeout = 5 * 1000, debounce: db = 300}) => {
    let value, next_t = new Date();
    fn = ()=>promisify(fn).then(x => value = x).catch(e => {
        throw e
    });
    const invalidate = debounce(fn, {timeout: db});
    const is_outdated = () => timeout >= 0 && new Date() >= next_t;
    const result = () => {
        if (is_outdated())
            invalidate();
        return value;
    };
    Object.assign(result, {
        is_outdated,
        invalidating: () => invalidate.is_running(),
        invalidate: ()=>invalidate(),
    });
    return result;
};

/**
 * @param a {Array}
 * @param b {Array}
 * @param hash_fn {Function<any>}
 * @return {*|boolean}
 */
export const sequence_equal = (a, b, hash_fn) => {
    if (!Array.isArray(a) || !Array.isArray(b))
        return false;
    if (a.length != b.length)
        return false;
    return a.every(left=>b.find(right=>{
        if (left == right)
            return true;
        if (hash_fn)
            return hash_fn(left) == hash_fn(right);
        return false;
    }));
};

export class WeakSet {
    /**@type {WeakRef[]}*/
    all_refs = [];
    wm = new WeakMap();

    constructor(arr = undefined) {
        if (Array.isArray(arr))
            arr.forEach(x => this.add(x));
    }

    add(obj) {
        this.wm.set(obj, true);
        this.all_refs.push(new WeakRef(obj));
    }

    has(obj) {
        return this.wm.has(obj);
    }

    clear() {
        this.wm = new WeakMap();
        this.all_refs = [];
    }

    delete(value) {
        this.wm.delete(value);
    }

    * [Symbol.iterator]() {
        for (let ref of this.all_refs) {
            let obj = ref.deref();
            if (obj && this.has(obj))
                yield obj;
        }
    }
}
