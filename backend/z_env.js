import fs from 'fs';
import os from 'os';
import path from 'path';
import {get_db} from './utils.js';
import {dur2str} from '../lib/utils.js';

const is_zon_root = async z_dir => {
    let file_or_folder = path.join(z_dir, 'pkg');
    if (!fs.existsSync(file_or_folder))
        return false;

    file_or_folder = path.join(z_dir, 'CVS', 'Repository');
    if (!fs.existsSync(file_or_folder))
        return false;

    let txt = await fs.promises.readFile(file_or_folder, 'utf8')
        .catch(e => console.error('Error during zon dir check:', e) || '')
        .then(x => x.trim());

    return txt == 'zon';
};

class FileMap {
    /**
     * Navigating field
     * @type {Map<string, FileMap>}
     */
    static all_files = new Map();

    /**
     * @param abs_path {string}
     * @param zon_rel {string}
     * @param stat {Stats}
     */
    constructor(abs_path, zon_rel, stat) {
        this.abs_path = abs_path;
        this.relative_path = zon_rel;
        this.types = new Set();
        if (stat?.isDirectory()) {
            /**
             * @type {FileMap[]}
             */
            this.children = [];
            this.types.add('folder');
        }
        FileMap.all_files.set(abs_path, this);
        this.parent?.children.push(this)
    }

    get parent() {
        let parent = FileMap.all_files.get(path.dirname(this.abs_path));
        if (parent?.children)
            return parent;
    }

    get flat_children() {
        let children = Array.from(FileMap.all_files.keys()).filter(x => x.startsWith(this.abs_path));
        return children.map(x => FileMap.all_files.get(x));
    }

    add_type(type) {
        if (!'selenium mocha folder ignored file'.split(' ').includes(type))
            console.warn('Unsupported file type:', type);
        else {
            this.types.add(type);
            this.parent?.types.add(type);
        }
    }

    /**
     * @param runs {TestRun[]}
     * @param ignored {IgnoredTest[]}
     */
    init_from_test_db(runs, ignored) {
        runs = runs.filter(x => x.file == this.relative_path);
        ignored = ignored.find(x => x.file == this.relative_path);
        if (!runs.length)
            return false;

        if (ignored)
            this.add_type('ignored')

        let r = runs.find(x => x.type)
        if (r)
            this.add_type(r.type);
        runs = runs.filter(x => x.result == 'fail' || x.result == 'success');
        if (runs.length) {
            this.success = runs.filter(x => x.result == 'success').length;
            this.fail = runs.filter(x => x.result == 'fail').length;
            this.avg = runs.filter(x => x.result == 'success')
                .map(x => x.end - x.start).reduce((s, c) => s + c, 0) / this.success;
            let last_run = runs.sort((a, b) => a.start - b.start)[0];
            this.last_run_failed = last_run.result == 'fail';
            this.last_run_date = last_run.start;
        }
        return true;
    }

    get_test_data(){
        let keys = 'success fail avg last_run_failed last_run_date'.split(' ');
        if (!this.types.has('folder'))
        {
            keys = keys.filter(x=>this.hasOwnProperty(x));
            if (keys.length)
                return keys.reduce((prev, key)=>Object.assign(prev, {[key]: this[key]}), {});
        } else if (this.types.size > 1) {
            let res = {}, test_datas = this.children.map(x=>x.get_test_data()).filter(Boolean);
            if (test_datas.length)
            {
                'success fail avg'.split(' ').forEach(key=>{
                    res[key] = test_datas.map(x=>x[key]).reduce((prev, c)=>prev+c, 0);
                });
                res.last_run_failed = this.children.some(x=>x.last_run_failed);
                res.last_run_date = this.children.map(x=>x.last_run_date).sort().pop();
                return res;
            }
        }
    }

    /**
     * @return {File}
     */
    toJSON() {
        const res = {
            filename: path.basename(this.abs_path),
            fullpath: this.abs_path,
            ...this.get_test_data()||{}
        };
        res.types = Array.from(this.types).filter(x=>x != 'file');
        if (this.children)
            res.children = this.children.map(x => x.toJSON());
        return res;
    }
}

export class ZonDir {
    constructor(abs_path) {
        this.zon_root = abs_path;
        this.dirname = path.basename(abs_path);
        this.watch_dir = path.join(abs_path, 'pkg');
    }

    _get_zon_rel_path(abs_path) {
        return path.relative(this.zon_root, abs_path);
    }

    /**
     * @param test_file {FileMap}
     * @param runs {TestRun[]}
     * @param ignored {IgnoredTest[]}
     * @return {Promise<void>}
     */
    async set_file_type(test_file, runs, ignored) {
        if (!test_file.init_from_test_db(runs, ignored)) {
            if (test_file.abs_path.endsWith('.js')) {
                let txt = await fs.promises.readFile(test_file.abs_path, 'utf8');
                let type = 'file';
                if (/^describe\(/g.test(txt) || txt.includes(' describe(')) {
                    type = txt.includes('selenium.') ? 'selenium' : 'mocha';
                    test_file.add_type(type);
                }
                return {
                    //  \/\/ constraint \/\/
                    file: test_file.relative_path,
                    start: new Date(),
                    // ^^^^ constraint ^^^^^^
                    result: 'init',
                    type,
                };
            }
        }
    }

    async _init() {
        console.debug('Starting scanning', this.dirname, 'folder');
        let now = new Date();

        /** @type {Nedb<TestRun>}*/
        this.test_runs_db = await get_db('/test_runs.jsonl', {
            indexes: [{unique: true, fieldName: 'file start'.split(' ')}],
            singleton: true,
        });
        /** @type {Nedb<IgnoredTest>} */
        this.ignored_tests_db = await get_db('/ignored_tests.jsonl', {
            indexes: [{unique: true, fieldName: 'file'}],
            singleton: true,
        });

        let map = await this._fs_init(this.watch_dir);
        for (let [abs_path, stat] of map.entries()) {
            new FileMap(abs_path, this._get_zon_rel_path(abs_path), stat);
        }
        this.root = FileMap.all_files.get(this.watch_dir);
        let [runs, ignored] = await Promise.all([
            this.test_runs_db.findAsync({}),
            this.ignored_tests_db.findAsync({}),
        ]);
        let pending_updates = await Promise.all(this.root.flat_children.filter(x => !x.types.size)
            .map(x => this.set_file_type(x, runs, ignored)));
        pending_updates = pending_updates.filter(Boolean);
        if (pending_updates.length)
            await this.test_runs_db.insertAsync(pending_updates);

        console.debug('Scanning finished', this.dirname, 'took', dur2str(new Date() - now, undefined,
            1));
    }

    /**
     * @param abs_path {string}
     * @param map {Map<string, Stats>}
     * @return {Promise<Map<string, Stats>>}
     * @private
     */
    async _fs_init(abs_path, map) {
        map = map || new Map();
        if (fs.existsSync(abs_path)) {
            let stat = await fs.promises.stat(abs_path)
                .catch(e => console.error('Error during file stat read:', e));
            if (stat?.isFile() || stat?.isDirectory())
                map.set(abs_path, stat);
            if (stat?.isDirectory()) {
                await fs.promises.readdir(abs_path)
                    .then(arr => arr.map(x=> path.join(abs_path, x)))
                    .catch(x => console.error('Error during directory read:', x))
                    .then(arr => Promise.all(arr.map(x=>this._fs_init(x, map))))
                    .catch(e=>console.error('Cannot read zon directory:', e));
            }
        }
        return map;
    }

    toJSON() {
        return {
            root: this.root.toJSON(),
        };
    }
}

/**
 * @return {Promise<ZonDir[]>}
 */
export async function get_zon_folders() {
    const dir = os.homedir();
    let children = await fs.promises.readdir(dir)
        .then(arr => arr.map(s => path.join(dir, s)))
        .catch(e => {
            console.error('Cannot read directory:', e);
            throw e;
        });
    children = await Promise.all(children.map(x=>is_zon_root(x).then(y=>y ? x : undefined)));
    children = children.filter(Boolean).map(x=>new ZonDir(x));
    let root = children.find(x=>path.basename(x.zon_root) == '.zon');
    await root._init(); // root folder must init at first
    return [root]; // XXX debug
    await Promise.all(children.filter(x=>x!=root).map(x => x._init()));
    return children;
}