import fs from 'fs';
import os from 'os';
import path from 'path';
import {get_db} from './utils.js';
import {mongo_apply} from '../lib/utils.js';

const is_zon_root = async z_dir => {
    let file_or_folder = path.join(z_dir, 'pkg');
    if (!fs.existsSync(file_or_folder))
        return false;

    file_or_folder = path.join(z_dir, 'CVS', 'Repository');
    if (!fs.existsSync(file_or_folder))
        return false;

    try {
        let txt = await fs.promises.readFile(file_or_folder, 'utf8');
        txt = txt.trim();
        if (txt != 'zon')
            return false;
    } catch (e) {
        console.error('Error during zon dir check:', e);
        return false;
    }
    return true;
};

const get_file_type = async filename => {
    if (filename.endsWith('.js')) {
        let txt = await fs.promises.readFile(filename, 'utf8');
        if (txt.includes('describe('))
            return txt.includes('selenium.') ? 'selenium' : 'mocha';
    }
    return 'file';
};

class ZonDir {
    constructor(abs_path) {
        this.dirname = path.basename(abs_path);
        this.zon_root = abs_path;
        this.watch_dir = path.join(abs_path, 'pkg');
        this.files = new Map();
        this.files.merge = (key, value, {upsert = 1} = {}) => {
            if (!key || !value)
                return;

            if (!this.files.has(key) && upsert)
                this.files.set(key, {});

            mongo_apply(this.files.get(key), value);
        };

        this.builds = new Map();
    }

    async _init() {
        /** @type {Nedb<TestRun>}*/
        this.test_runs_db = await get_db('/test_runs.jsonl', {
            indexes: [{unique: true, fieldName: 'file start'.split(' ')}],
            singleton: true,
        });
        this.ignored_tests_db = await get_db('/ignored_tests.jsonl', {
            indexes: [{unique: true, fieldName: 'file'}],
            singleton: true,
        });
        this.files.clear();
        await this.read_file(this.watch_dir);
        this.watcher = fs.watch(this.watch_dir, {encoding: 'utf8', recursive: true, persistent: true},
            this.handle_file_change);
        clearInterval(this.recheck_meta_i);
        this.recheck_meta_i = setInterval(this.recheck_meta, 1000 * 5);
    }

    async read_file(abs_path) {
        let stat = await fs.promises.stat(abs_path).catch(e => {
            console.warn('Error during file read:', e);
        });

        if (stat?.isDirectory()) {
            this.files.merge(abs_path, {type: 'folder', children: []});
            let children = await fs.promises.readdir(abs_path)
            children = children.map(x=>path.join(abs_path, x));
            await Promise.all(children.map(x=>this.read_file(x)));
        }

        if (stat?.isFile()) {
            this.files.merge(abs_path, {type: await get_file_type(abs_path), $unset: {children: ''}});
            let file = this.files.get(abs_path), mutator = {children: {$push: [file]}};
            if (file.type != 'file')
            {
                await this.test_runs_db.insertAsync({
                    file: abs_path, start: new Date(), type: file.type,
                    last_result: 'init'
                });
                if (file.type == 'selenium')
                    mutator.has_selenium = true;
                if (file.type == 'mocha')
                    mutator.has_mocha = true;
            }
            this.files.merge(path.dirname(abs_path), mutator, {upsert: 0});
        }
    }

    async handle_file_change(e, filename) {

    }

    async recheck_meta() {

    }
}

/**
 * Init zon folder watcher
 * @return {AsyncGenerator<ZonDir, void, *>}
 */
export async function get_zon_folders() {
    let dir = os.homedir(), children;
    try {
        children = await fs.promises.readdir(dir);
        children = children.map(x => path.join(dir, x));
    } catch (e) {
        console.error('CRIT error during dir reading:', e);
        throw e;
    }
    let result = [];
    for (let folder of children) {
        if (await is_zon_root(folder)) {
            let res = new ZonDir(folder);
            result.push(res);
        }
    }
    await Promise.all(result.map(x=>x._init()));
    return result;
}