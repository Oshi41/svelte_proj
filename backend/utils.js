import fs from 'fs';
import os from 'os';
import path from 'path';
import child_process from 'child_process';
import {Nedb} from './datastore.js';
import {pick} from '../lib/utils.js';

const db_cache = new Map();


/**
 * Read program related file
 * @param name {string} - relative path
 * @param default_text {string} - default file content
 * @return {string} - file content in UTF8
 */
const read_file = (name, {default_text = undefined}) => {
    let filepath = resolve_rel_path(name);
    if (!fs.existsSync(filepath) && default_text)
        fs.writeFileSync(filepath, default_text, 'utf8');
    return fs.readFileSync(filepath, 'utf8');
};

/**
 * @param name {string} relative path
 * @return {string}
 */
const resolve_rel_path = name => {
    if (!name)
        return '';

    let filepath = path.join(os.homedir(), 'work_utils', name);
    let dir = path.dirname(filepath);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
    return filepath;
}

/**
 * Gets zon root dir
 * @param abs_path - file inside zon dir
 * @return {Promise<*|string>}
 */
const get_zon_root_dir = async abs_path => {
    while (abs_path) {
        let filename = path.join(abs_path, 'CVS', 'Repository');
        if (fs.existsSync(filename) && 'zon' == (await fs.promises.readFile(filename, 'utf8')).trim())
            return abs_path;
        abs_path = path.dirname(abs_path);
    }
    return '';
};

/**
 * Returns relative path from zoon root
 * @param abs_path {string} filename inside zon dir
 * @return {Promise<string>}
 */
export const get_zon_rel_path = async abs_path => {
    let root = await get_zon_root_dir(abs_path);
    let res = path.relative(root, abs_path);
    return res;
};

const wrap_log = (source, func, dbg_hdr = '') => {
    let orig = source[func].bind(source);
    source[func] = (...args) => {
        console.debug(dbg_hdr, 'calling', func, 'arguments:', JSON.stringify(args, null, 2));
        orig(...args);
    };
    source['orig_' + func] = orig;
}

/**
 * Gets or creates DB
 * @param name {string | undefined} path to db (undef if in memory)
 * @param indexes {Nedb.EnsureIndexOptions[] | undefined} optional DB indexes
 * @param singleton {boolean} single instance per program
 * @return {Promise<Nedb>}
 */
export const get_db = async (name = undefined, {indexes = [], singleton = true}) => {
    if (name)
        name = resolve_rel_path(name);
    let db = new Nedb({
        inMemoryOnly: !name,
        filename: name,
    });
    if (+process.env.DEBUG) {
        wrap_log(db, 'updateAsync');
    }
    if (singleton && db_cache.has(name))
        db = db_cache.get(name);
    if (singleton && !db_cache.has(name))
        db_cache.set(name, db);
    for (let index of indexes) {
        await db.ensureIndexAsync(index);
    }
    await db.loadDatabaseAsync();
    return db;
}

/**
 * @param args
 * @return {Promise<{stdout: Readable, stderr: Readable, exitCode: number}>}
 */
export const spawn_async = (...args) => new Promise(resolve => {
    let proc = child_process.spawn(...args);
    const handle = () => resolve(pick(proc, 'stdout stderr exitCode'));
    proc.on('exit', handle);
    proc.on('disconnect', handle);
    proc.on('close', handle);
    proc.on('error', handle);
});

/**
 * Awaits for event result
 * @param src {EventEmitter}
 * @param event {string}
 * @return {Promise<unknown>}
 */
export const on_async = (src, event) => new Promise(resolve => {
    src.once(event, (...args) => {
        resolve(...args);
    });
});

/**
 * Extending classes into one
 * @param arr {Class[]} - array of classes in base->derived order
 * @return {Function}
 */
export const extend_classes = (...arr) => {
    let protos = new Set();
    for (let {prototype} of arr.reverse())
    {
        let current = [];
        while (prototype)
        {
            current.unshift(prototype);
            prototype = Object.getPrototypeOf(prototype);
        }
        // insert in order base -> derived
        current.forEach(x=>protos.add(x));
    }
    protos.delete(Object.prototype); // deleting base Obj proto
    protos = [...protos];
    let base = protos[0];
    let res = protos.slice(1).reduce((p, c) =>Object.setPrototypeOf(c, p) , base);
    return res.constructor;
}