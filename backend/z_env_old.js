import fs from 'fs';
import os from 'os';
import path from 'path';
import {watch} from 'chokidar';
import {EventEmitter} from 'events';
import {get_db, on_async} from './utils.js';
import {dur2str, debounce, mls} from '../lib/utils.js';
import {Terminal, create_args} from './terminal.js';
import {children} from "svelte/internal";

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
    static emitter = new EventEmitter();

    /**
     * @param abs_path {string}
     * @param zon_rel {string}
     * @param stat {Stats}
     */
    constructor(abs_path, zon_rel, stat) {
        this.abs_path = abs_path;
        this.relative_path = zon_rel;
        if (stat?.isDirectory()) {
            /**
             * @type {FileMap[]}
             */
            this.children = [];
            this.is_folder = true;
            for (let key of 'ignored mocha selenium cvs_changed'.split(' ')) {
                key = 'is_'+key;
                Object.defineProperty(this, key, {
                    get() {
                        return this.children.some(x=>x[key]);
                    }
                });
            }
            for (let key of 'success fail avg'.split(' ')) {
                Object.defineProperty(this, key, {
                    get() {
                        return this.children.reduce((prev, s)=>prev + s[key], 0);
                    }
                });
            }
            for (let key of 'last_run_failed last_run_date'.split(' ')) {
                Object.defineProperty(this, key, {
                    get() {
                        return this.children.map(x=>x[key]).filter(Boolean).sort().pop()
                    }
                });
            }
        } else if (stat?.isFile()) {
            Object.defineProperty(this, 'is_cvs_changed', {
                get() {
                    return this._is_cvs_changed;
                },
                set(v) {
                    if (this.is_cvs_changed != v)
                    {
                        this._is_cvs_changed = v;
                        FileMap.emitter.on('cvs_upd', this);
                    }
                }
            })
        }
        if (/(^|\/)\.[^\/\.]/g.test(abs_path))
            this._is_hidden = true;
        FileMap.all_files.set(abs_path, this);
        this.parent?.children.push(this);
        this.check_cvs = debounce(this.check_cvs_now.bind(this), {timeout: 30*mls.s});
    }

    get is_hidden(){
        return this._is_hidden || this.parent?.is_hidden;
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

    async check_cvs_now() {
        if (!this.is_folder)
            return this.parent?.check_cvs(); // nearest folder

        let parent = this.parent;
        while (parent)
        {
            if (parent.check_cvs.is_running())
                return; // parent is already running
            parent = parent.parent;
        }

        let now = new Date();
        console.debug('starting cvs check for', this.abs_path);

        const {std, err} = await on_async(
            new Terminal({
                cwd: this.abs_path,
                shell: 'cvs',
                args: '-Q status'.split(' '),
            }),
            'exit',
        );
        if (err)
            console.warn('Error during cvs check:', err);

        let lines = std.flatMap(x => x[0].split('\n'));
        let r_name = /^File: (\S+)\s+Status:/;
        let r_rel_file = /\/zon\/(.*),/;
        let rel_changes = [];
        for (let i = 0; i < lines.length; i++) {
            let name = r_name.exec(lines[i])?.[1];
            if (!name)
                continue;
            let rel_path = r_rel_file.exec(lines[i + 3])?.[1];
            if (!rel_path)
                continue;

            if (lines[i].includes('Locally'))
                rel_changes.push(rel_path);
        }

        if (rel_changes.length)
        {
            const children = Array.from(this.flat_children.values()).filter(x=>!x.is_folder);
            for (let child of children)
                child.is_cvs_changed = rel_changes.includes(child.relative_path);
        }

        console.debug('cvs check for', this.abs_path, 'finished, took',
            dur2str(new Date() - now));
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
            this.is_ignored = true;

        let r = runs.find(x => x.type)
        if (r)
            this['is_'+r.type] = true;
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

    /**
     * @return {TreeFile}
     */
    toJSON() {
        const res = {
            filename: path.basename(this.abs_path),
            fullpath: this.abs_path,
        };
        for (let key of 'success fail avg last_run_failed last_run_date'
            .split(' '))
        {
            let val = this[key];
            if (val)
                res[key] = val;
        }
        res.types = 'ignored mocha selenium cvs_changed folder hidden'.split(' ')
            .filter(x=>this['is_'+x]);
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
                    test_file['is_'+type] = true;
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
        await this._init_file(this.root);


        this.watcher = watch(this.watch_dir, {
            ignoreInitial: true,
            interval: 300,
        });
        this.watcher.on('all', this._handle_fs_change.bind(this));
        await on_async(this.watcher, 'ready');

        await this.root.check_cvs.force_fn();

        console.debug('Scanning finished', this.dirname, 'took', dur2str(new Date() - now, undefined,
            1));
    }

    /**
     * Fill file with test info
     * @param file {FileMap}
     * @return {Promise<void>}
     * @private
     */
    async _init_file(file) {
        const children = file.flat_children;
        const ids = children.map(x => x.relative_path);
        const q = {file: {$in: ids}};
        let [runs, ignored] = await Promise.all([
            this.test_runs_db.findAsync(q),
            this.ignored_tests_db.findAsync(q),
        ]);
        let pending_updates = await Promise.all(
            children.map(x => this.set_file_type(x, runs, ignored))
        );
        pending_updates = pending_updates.filter(Boolean);
        if (pending_updates.length)
            await this.test_runs_db.insertAsync(pending_updates);
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
                    .then(arr => arr.map(x => path.join(abs_path, x)))
                    .catch(x => console.error('Error during directory read:', x))
                    .then(arr => Promise.all(arr.map(x => this._fs_init(x, map))))
                    .catch(e => console.error('Cannot read zon directory:', e));
            }
        }
        return map;
    }

    /**
     * @param eventName {'add'|'addDir'|'change'|'unlink'|'unlinkDir'}
     * @param filepath {string}
     * @param stat {Stats|undefined}
     */
    async _handle_fs_change(eventName, filepath, stat) {
        if (!stat && fs.existsSync(filepath))
            stat = await fs.promises.stat(filepath);

        if (eventName == 'unlinkDir' || eventName == 'unlink' || eventName == 'addDir') {
            const to_remove = Array.from(FileMap.all_files.keys())
                .filter(x => x.startsWith(filepath));
            to_remove.forEach(x => FileMap.all_files.delete(x));
        }

        if (eventName == 'addDir') {
            let map = await this._fs_init(filepath);
            for (let [abs_path, stat] of map.entries()) {
                new FileMap(abs_path, this._get_zon_rel_path(abs_path), stat);
            }
        }

        if (stat?.isFile()) {
            let file = new FileMap(filepath, this._get_zon_rel_path(filepath), stat);
            await this._init_file(file);
            file.check_cvs(); // recheck cvs status
        } else (!stat)
            console.warn('TreeFile', filepath, 'is not exist');
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
    children = await Promise.all(children.map(x => is_zon_root(x).then(y => y ? x : undefined)));
    children = children.filter(Boolean).map(x => new ZonDir(x));
    let root = children.find(x => path.basename(x.zon_root) == '.zon');
    try {
        await root._init(); // root folder must init at first
        return [root]; // XXX debug
        await Promise.all(children.filter(x => x != root).map(x => x._init()));
        return children;
    } catch (e) {
        console.error('Error during zon dir init:', e);
    }
}