import {EventEmitter} from "events";
import path from 'path';
import os from 'os';
import fs from 'fs';
import {watch} from "chokidar";
import {dur2str, debounce, mls, cached, sleep} from '../lib/utils.js';
import {on_async, get_db} from "./utils.js";
import {Terminal} from "./terminal.js";
import {Store_emitter} from './store_emitter.js';

/**
 * @type {Map<string, Z_File_Or_Folder>}
 */
const all_files = new Map();
export const emitter = new Store_emitter(mls.s, (e_name, args) => args.abs_path);

/**
 * @param dir {string} - abs path to checking directory
 * @return {Promise<string[]>} - zon relative cvs changed files
 */
const check_cvs_stat = async (dir) => {
    let now = new Date();
    console.debug(`[${dir}] cvs check...`);

    const {std, err} = await on_async(
        new Terminal({
            cwd: dir,
            shell: 'cvs',
            args: '-Q status'.split(' '),
        }),
        'exit',
    );
    if (err) {
        console.warn('Error during cvs check:', err);
        return [];
    }

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
    console.debug(`[${dir}] cvs check ended, tool ${dur2str(new Date() - now, undefined, 1)}`);
    return rel_changes;
};

const sort_fn = z_dir => (l, r) => {
    l = path.relative(z_dir, l).split('/');
    r = path.relative(z_dir, r).split('/');
    let compare = l.length - r.length;
    if (compare)
        return compare;
    return l.pop()?.localeCompare(r?.pop()) || 0;
}

export class Z_File_Or_Folder {
    /**
     * @param abs_path {string}
     * @param stat {Stats}
     * @param zon_relative {string}
     */
    constructor(abs_path, stat, zon_relative) {
        this.abs_path = abs_path;
        this.zon_relative = zon_relative;
        this.stat = stat;

        /**
         * Request to check cvs changed status
         * @type {Function&{cancel: (function(): void), force_fn: Function, is_running: (function(): boolean)}}
         */
        this.recheck_cvs = debounce(this._recheck_cvs.bind(this), {timeout: 10 * mls.s});
        all_files.set(this.abs_path, this);

        if (this.is_folder) {
            this._children = [];
            this._flat_children = [];
            this._upd_children = debounce(() => {
                console.debug(`[update children] [${this.abs_path}]`);
                let flat = Array.from(all_files.keys())
                    .filter(x => x.startsWith(this.abs_path) && x != this.abs_path)
                    .sort(sort_fn(this.abs_path));
                if (flat.toString() != this._flat_children.toString()) {
                    this._flat_children = flat;
                    this.parent?._upd_children();
                }
                let children = flat.filter(x => path.dirname(x) == this.abs_path);
                if (children.toString() != this._children.toString())
                    this._children = children;

            }, {timeout: 150});
        }

        this.parent?._upd_children();
    }

    /**
     * Direct child
     * @return {Z_File_Or_Folder[]}
     */
    get children() {
        if (this.is_folder)
            return this._children?.map(x => all_files.get(x)) || [];
    }

    /**
     * All inner children
     * @return {Z_File_Or_Folder[]}
     */
    get flat_children() {
        if (this.is_folder)
            return this._flat_children?.map(x => all_files.get(x)) || [];
    }

    get is_folder() {
        return !this.stat?.isFile() || this.stat?.isDirectory();
    }

    /**
     * Returns parent. If present, always directory
     * @return {Z_File_Or_Folder | undefined}
     */
    get parent() {
        return all_files.get(path.dirname(this.abs_path));
    }

    /**
     * Is gidden file or folder
     * @return {boolean}
     */
    get is_hidden() {
        if (this.parent?.is_hidden)
            return true;
        if (os.platform() == 'win32') {

        } else {
            if (/(^|\/)\.[^\/\.]/g.test(path.basename(this.abs_path)))
                return true;
        }
        return false;
    }

    /**
     * Set property and fires event
     * @param propname {string} name of the prop
     * @param value {any} changed value
     * @param e_name {string} event name to fire. Fires with updated value
     * @private
     */
    _set_and_notify(propname, value, e_name = 'changed') {
        if (this.is_folder)
            throw new Error(`Cannot set [${propname}] = ${value} to folder`);

        if (this[propname] == value)
            return;
        this[propname] = value;
        emitter.emit(e_name, this);
        console.debug(`[${this.abs_path}].${propname} changed`);
    }

    get is_mocha() {
        if (this.is_folder) {
            return this.children.some(x => x.is_mocha);
        }

        return this._is_mocha;
    }

    set is_mocha(v) {
        this._set_and_notify('_is_mocha', v);
    }

    get is_selenium() {
        if (this.is_folder) {
            return this.children.some(x => x.is_selenium);
        }

        return this._is_selenium;
    }

    set is_selenium(v) {
        this._set_and_notify('_is_selenium', v);
    }

    get success() {
        if (this.is_folder) {
            return this.children.filter(x => !x.is_folder && x.success)
                .reduce((prev, x) => prev + x.success, 0);
        }
        return this._success;
    }

    set success(v) {
        this._set_and_notify('_success', v);
    }

    get fail() {
        if (this.is_folder) {
            return this.children.filter(x => !x.is_folder && x.fail)
                .reduce((prev, x) => prev + x.fail, 0);
        }
        return this._fail;
    }

    set fail(v) {
        this._set_and_notify('_fail', v);
    }

    get avg() {
        if (this.is_folder) {
            return this.children.filter(x => !x.is_folder && x.avg)
                .reduce((prev, x) => prev + x.avg, 0);
        }
        return this._avg;
    }

    set avg(v) {
        this._set_and_notify('_avg', v);
    }

    get is_cvs_changed() {
        if (this.is_folder) {
            return this.children.some(x => x.is_cvs_changed);
        }

        return this._is_cvs_changed;
    }

    set is_cvs_changed(v) {
        this._set_and_notify('_is_cvs_changed', v);
    }

    get last_run_failed() {
        if (this.is_folder) {
            return this.children.filter(x => !x.is_folder)
                .sort((a, b) => a.last_run_date - b.last_run_date)
                .pop()?.last_run_failed;
        }
        return this._last_run_failed;
    }

    set last_run_failed(v) {
        this._set_and_notify('_last_run_failed', v);
    }

    get is_running() {
        return !!this.test_terminal;
    }

    get last_run_date() {
        if (this.is_folder) {
            return this.children.filter(x => !x.is_folder)
                .map(x => x.last_run_date).sort().pop();
        }

        return this._last_run_date;
    }

    set last_run_date(v) {
        this._set_and_notify('_last_run_date', v);
    }

    get is_ignored() {
        return !this.is_folder && this.ignored_reason;
    }

    /**
     * Run cvs checkup.
     * Runs only for folders. IF any parent is already run command, skip the call
     * @return {Promise}
     * @private
     */
    async _recheck_cvs() {
        console.debug(`[${this.abs_path}] cvs check attempt`);
        // cvs check works only for folders
        if (!this.is_folder)
            return this.parent?.recheck_cvs();
        let parent = this.parent;
        while (parent) {
            // cvs status works recursively
            // so no need to run if parent already work
            if (parent.recheck_cvs.is_running())
                return parent.recheck_cvs();
            parent = parent.parent;
        }
        console.time(`[${this.abs_path}] cvs check`);
        // retreive all recursive files
        const all_children = this.flat_children.filter(x => !x.is_folder);
        // list of zon-relative changed files
        let changed = await check_cvs_stat(this.abs_path);
        all_children.forEach(x => x.is_cvs_changed = changed.includes(x.zon_relative));
        console.timeEnd(`[${this.abs_path}] cvs check`);
    }

    /**
     * reads test file type
     * @return {Promise<void | 'mocha' | 'selenium' | 'file'>}
     * @private
     */
    async _get_test_file_type_async() {
        if (!this.abs_path.endsWith('.js'))
            return;

        let txt = await fs.promises.readFile(this.abs_path, 'utf8');
        const is_test = /^describe\(/g.test(txt) || txt.includes(' describe(');
        if (!is_test)
            return 'file';
        return txt.includes('selenium.') ? 'selenium' : 'mocha';
    }

    /**
     * @param runs {TestRun[]}
     * @param ignored {IgnoredTest[]}
     * @private
     */
    async _upd_from_db_async(runs, ignored) {
        runs = runs.filter(x => x.file == this.zon_relative);
        let run_info = runs.find(x => x.result == 'init');

        const run_types = 'success fail'.split(' ');
        runs = runs.filter(x => run_types.includes(x.result));

        if (runs.length) {
            let s_runs = runs.filter(x => x.result == 'success');
            this.success = s_runs.length;
            this.fail = runs.filter(x => x.result == 'fail').length;
            this.avg = s_runs.map(x => x.end - x.start).reduce((s, c) => s + c, 0) / this.success;
            let last_run = runs.sort((a, b) => a.start - b.start).pop();
            this.last_run_failed = last_run.result == 'fail';
            this.last_run_date = last_run.start;
        }

        ignored = ignored.find(x => x.file == this.zon_relative);
        /** Reason why test is ignored
         *  @type {string} */
        this.ignored_reason = ignored?.ignore_reason;

        let test_type = run_info?.type, to_return;
        if (!test_type) {
            let test_type = await this._get_test_file_type_async();
            if (test_type) {
                to_return = {
                    file: this.zon_relative,
                    type: test_type,
                };
            }
        }

        this.is_mocha = test_type == 'mocha';
        this.is_selenium = test_type == 'selenium';
        return to_return;
    }

    /**
     * Init folder as root. Must use on pkg directory
     * @param zon_dir {string} abs path to zon root
     * @return {Promise<void>}
     */
    async init_as_root(zon_dir) {
        if (!this.is_folder)
            throw new Error('cannot use file as root folder');
        console.time(`[${this.abs_path}] init_as_root`);
        this.root = zon_dir;

        this.build_watcher = watch(`${this.root}/build.[!/]*/hardlink.log`, {
            ignoreInitial: true,
            interval: 300,
            usePolling: true,
            alwaysStat: true,
        });
        await on_async(this.build_watcher, 'ready');

        /**
         * Name of zon folder
         * @type {string}
         */
        this.name = path.basename(zon_dir);

        let time_end = console.time(`[${this.abs_path}] init databases`);
        /**
         * @type {{ignored: Nedb, runs: Nedb}}
         */
        this.db = {
            runs: await get_db('/test_runs.jsonl', {
                indexes: [{unique: true, fieldName: 'file start'.split(' ')}],
                singleton: true,
            }),
            ignored: await get_db('/ignored_tests.jsonl', {
                indexes: [{unique: true, fieldName: 'file'}],
                singleton: true,
            }),
        };
        time_end();

        /**
         * Upd files from test runs and writes init info if needed
         * @param zfiles {Z_File_Or_Folder[]}
         * @param runs {TestRun[]}
         * @param ignored {IgnoredTest[]}
         * @return {Promise<void>}
         */
        const setup_from_tests = async (zfiles, runs, ignored) => {
            let res = await Promise.all(zfiles.filter(x => !x.is_folder)
                .map(x => x._upd_from_db_async(runs, ignored)));
            res = res.filter(Boolean).map(x => Object.assign(x, {
                result: 'init',
                start: new Date(), // constraint key (file/start)
            }));
            if (res.length)
                await this.db.runs.insertAsync(res);
        };
        this.db.runs.on('add', async docs => {
            let $in = Array.from(new Set(docs.map(x => x.file)));
            console.debug(`Detected ${$in.length} db changes`);
            let t = console.time(`Detected ${$in.length} db changes, read db records`);
            const [_runs, _ignored] = await Promise.all([
                this.db.runs.findAsync({file: {$in}}),
                this.db.ignored.findAsync({file: {$in}}),
            ]);
            t();
            const all_children = this.flat_children;
            /** @type {Z_File_Or_Folder[]}*/
            let files = $in.map(x => all_children.find(x => x.zon_relative == x))
                .filter(Boolean);
            t = console.time(`updated ${files.length} files from db change`);
            await setup_from_tests(files, _runs, _ignored);
            t();
        });

        this.watcher = watch(this.abs_path, {
            ignoreInitial: true,
            interval: 300,
            alwaysStat: true,
        });

        const on_unlink = abs_path => {
            let to_rm = Array.from(all_files.keys()).filter(x => x.startsWith(abs_path));
            to_rm.forEach(x => all_files.delete(x));
        };
        this.watcher.on('unlink', on_unlink)
        this.watcher.on('unlinkDir', on_unlink);

        const on_add = (abs_path, stat) => {
            stat = stat || fs.statfsSync(abs_path);
            new Z_File_Or_Folder(abs_path, stat, path.relative(zon_dir, abs_path));
        };
        this.watcher.on('add', on_add);
        this.watcher.on('addDir', on_add);

        const on_change = (abs_path, stat) => {
            let f = all_files.get(abs_path);
            if (!f)
                return console.warn(`File is not exist: ${abs_path}`);
            stat = stat || fs.statSync(abs_path);
            f.stat = stat;
            f.recheck_cvs();
        };
        this.watcher.on('change', on_change);

        time_end = console.time(`[${this.abs_path}] watcher scan`);
        await on_async(this.watcher, 'ready');
        time_end();

        // dirs at first (to make hierarchy)
        let all_paths = Object.keys(this.watcher.getWatched()).sort(sort_fn(zon_dir));
        // Then fill with files
        all_paths.push(...Object.entries(this.watcher.getWatched())
            .flatMap(([dir, files]) => files.map(x => path.join(dir, x)))
            .sort(sort_fn(zon_dir)));

        time_end = console.time(`[${this.abs_path}] init ${all_paths.length} files`);
        // recursive children (rm self too!)
        all_paths = Array.from(new Set(all_paths.filter(x => x.startsWith(this.abs_path) && x != this.abs_path)));
        all_paths = all_paths.map(x => new Z_File_Or_Folder(x, fs.statSync(x), path.relative(zon_dir, x)));
        time_end();

        time_end = console.time('read all db');
        const [runs, ignored] = await Promise.all([
            this.db.runs.findAsync({}),
            this.db.ignored.findAsync({}),
        ]);
        time_end();

        time_end = console.time(`[${this.abs_path}] setup from test runs`);
        await sleep(151); // breath some air to finish debounce funcs

        await setup_from_tests(
            this.flat_children.filter(x => !x.is_folder),
            runs, ignored
        );
        time_end();
        console.timeEnd(`[${this.abs_path}] init_as_root`);
    }

    /**
     * Convert to tree structure
     * @param include_children should include children?
     * @return {TreeFile}
     */
    to_tree_file_json(include_children = true) {
        let types = 'selenium mocha folder ignored running cvs_changed hidden'
            .split(' ').sort().filter(x => !!this['is_' + x]);
        const res = {
            fullpath: this.abs_path,
            filename: path.basename(this.abs_path),
            types,
        };
        const apply = 'success fail avg'.split(' ').map(x => [x, this[x]])
            .filter(([, x]) => x && Number.isFinite(x));
        'last_run_failed last_run_date ignored_reason'.split(' ').map(x => [x, this[x]])
            .filter(([, x]) => !!this[x]).forEach(x => apply.push(x));
        const children = this.children;
        if (children?.length && include_children)
            apply.push(['children', children.map(x => x.to_tree_file_json(include_children))]);

        apply.forEach(([prop, val]) => res[prop] = val);
        return res;
    }

    to_build_meta_json() {

    }

    /**
     * @param cmd {'run' | 'stop' | 'ignore' | 'rm_ignore'}
     * @param paths {string[]}
     */
    async handle_command(cmd, paths) {
        paths = Array.isArray(paths) ? paths : [paths];
        paths = paths.filter(x => x.startsWith(this.abs_path));
        if (!paths.length)
            return;
        /** @type {Z_File_Or_Folder[]}*/
        const tests = paths.map(x => all_files.get(x));
        let docs, wrong = tests.filter(x => !x.is_mocha && x.is_selenium);
        if (wrong.length) {
            return {
                err: 'Not a tests',
                paths: wrong.map(x => x.abs_path),
            }
        }
        switch (cmd) {
            case "run":
                if (this.is_running) {
                    return {
                        err: 'Already running',
                        paths: this.flat_children?.filter(x => x.test_terminal)
                            .map(x => x.abs_path),
                    }
                }
                for (let test of tests) {
                    let start = new Date();
                    test.test_terminal = new Terminal({
                        shell: 'zmocha',
                        cwd: test.is_folder ? test.abs_path : path.dirname(test.abs_path),
                        args: test.is_folder ? [] : ['-T', path.basename(test.abs_path)],
                    });
                    emitter.emit('changed', test);
                    test.test_terminal.on('spawn', () => {
                        start = new Date();
                    });
                    test.test_terminal.once('exit', async ({err, std}) => {
                        test.test_terminal = null;
                        const doc = {
                            file: test.zon_relative,
                            start,
                            end: new Date(),
                            result: err == 'SIGINT' ? 'canceled' : err ? 'fail' : 'success',
                            type: test.is_mocha ? 'mocha' : 'selenium',
                            ...err && {error: err},
                        };
                        await this.db.runs.insertAsync(doc);
                        test.last_run_date = start;
                        test.last_run_failed = doc.result == 'fail';
                    });
                    await on_async(test.test_terminal, 'exit');
                }
                break;
            case "stop":
                wrong = tests.filter(x => !x.is_running);
                if (wrong.length) {
                    return {
                        err: 'Not running',
                        paths: wrong.map(x => x.abs_path),
                    }
                }
                for (let test of tests)
                    test.test_terminal.write_signal('kill');
                break;
            case "ignore":
                wrong = tests.filter(x => x.is_ignored);
                if (wrong.length) {
                    return {
                        err: 'Already ignored',
                        paths: wrong.map(x => x.abs_path),
                    }
                }
                docs = tests.map(x=>({
                    file: x.zon_relative,
                    ignore_reason: 'disable test from GUI',
                }));
                await this.db.ignored.insertAsync(docs);
                break;
            case "rm_ignore":
                wrong = tests.filter(x => !x.is_ignored);
                if (wrong.length) {
                    return {
                        err: 'Not ignored',
                        paths: wrong.map(x => x.abs_path),
                    }
                }
                await this.db.ignored.removeAsync({file: {$in: tests.map(x=>x.zon_relative)}}, {multi: true});
                break;
            default:
                console.debug('Unknown zon dir command:', cmd);
                break;
        }
    }

    /**
     * @return {TreeFile}
     */
    toJSON() {
        let res = {
            root: this.to_tree_file_json(),
            builds: this.to_build_meta_json(),
        };
        return res;
    }
}

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

/**
 * @return {Promise<Map<string, Z_File_Or_Folder>>}
 */
export const get_zon_folders = async () => {
    const dir = os.homedir();
    let children = await fs.promises.readdir(dir)
        .then(arr => arr.map(s => path.join(dir, s)))
        .catch(e => {
            console.error('Cannot read directory:', e);
            throw e;
        });
    children = await Promise.all(children.map(x => is_zon_root(x).then(y => y ? x : undefined)));
    children = children.filter(x => x && x.endsWith('.zon'));
    let res = new Map(children.map(x => {
        const pkg_path = path.join(x, 'pkg');
        return [path.basename(x), new Z_File_Or_Folder(
            pkg_path,
            fs.statSync(pkg_path),
            path.relative(x, pkg_path),
        )];
    }));
    await Promise.all(Array.from(res.entries()).map(([dir, x]) => x.init_as_root(dir)));
    return res;
};