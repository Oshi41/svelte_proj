import '../console_patch.js';
import {watch} from "chokidar";
import fs from "fs";
import os from "os";
import {on_async} from "../utils.js";
import path from "path";
import {debounce, sequence_equal, sleep} from "../../lib/utils.js";

/**
 * @type {Map<string, Path_base>}
 */
export const all_files = new Map();

export const dir_sort_fn = root => (left, right) => {
    left = path.relative(root, left).split('/');
    right = path.relative(root, right).split('/');
    let compare = left.length - right.length;
    if (compare)
        return compare;
    return left.pop()?.localeCompare(right?.pop()) || 0;
}

export class Path_base {
    constructor(zon_dir, abs_path, stat) {
        this.abs_path = abs_path;
        this.relative_path = path.relative(zon_dir, abs_path);
        this.stat = stat || fs.statSync(abs_path);
        if (this.is_folder) {
            this._children_keys = [];
            this._flat_children_keys = [];
        }
        all_files.set(this.abs_path, this);
    }

    _recalc_children(call_parent = false)
    {
        if (this.is_folder)
        {
            this._flat_children_keys = Array.from(all_files.keys())
                .filter(x => x.startsWith(this.abs_path) && x != this.abs_path);
            this._children_keys = this._flat_children_keys
                .filter(x => !path.relative(this.abs_path, x).includes('/'));
        }

        if (call_parent)
            this.parent?._recalc_children();
    }

    /**
     * Contains additional initialyze
     * @return {Promise<void>}
     */
    async additional_init() {

    }

    time(txt) {
        return console.time(`[${this.abs_path}] ${txt}`);
    }

    get is_folder() {
        return this.stat?.isDirectory() && !this.stat?.isFile();
    }

    /**
     * @return {Path_base|undefined}
     */
    get parent() {
        return all_files.get(path.dirname(this.abs_path));
    }

    get is_hidden() {
        if (this.parent?.is_hidden)
            return true;
        if (os.platform() == 'win32') {
            return false;
        }
        return /(^|\/)\.[^\/\.]/g.test(path.basename(this.abs_path));
    }

    /**
     * @return {Path_base[]|undefined}
     */
    get children() {
        if (this.is_folder)
            return this._children_keys.map(x => all_files.get(x));
    }

    /**
     * @return {Path_base[]}
     */
    get flat_children() {
        if (this.is_folder)
            return this._flat_children_keys.map(x => all_files.get(x));
    }

    /**
     * Setup path as zon root dir
     * @param zon_dir actual zon root directoy
     * @return {Promise<void>}
     */
    async zon_init(zon_dir) {
        this.zon_dir = zon_dir;
        let end = console.time(`[${this.abs_path}] init`);
        await this._zon_init();
        end();
    }

    /**
     * Overridable implementation
     * @return {Promise<void>}
     * @private
     */
    async _zon_init() {
        let end = this.time('file watcher init');
        this.watcher = watch(this.abs_path, {
            ignoreInitial: true,
            interval: 300,
            alwaysStat: true,
        });
        this.watcher.on('all', this._on_file_change.bind(this));
        await on_async(this.watcher, 'ready');
        end();
        end = this.time('tree folder init');
        const watched = this.watcher.getWatched()
        let dirs = Object.keys(watched).sort(dir_sort_fn(this.zon_dir))
            .filter(x => x.startsWith(this.abs_path) && x != this.abs_path);
        dirs.forEach(x => {
            let child = new this.constructor(this.zon_dir, x, fs.statSync(x));
            all_files.set(x, child);
        });
        end();
        end = this.time('rest files init');
        for (let dir of dirs) {
            for (let abs_path of watched[dir].map(x => path.join(dir, x))) {
                let child = new this.constructor(this.zon_dir, abs_path, fs.statSync(abs_path));
                all_files.set(abs_path, child);
            }
        }
        end();
        end = this.time('additional init');
        let all_tree = [this, ...this.flat_children];
        all_tree.forEach(x=>x._recalc_children()); // build tree
        let promises = [this, ...this.flat_children].map(x => x.additional_init());
        await Promise.all(promises);
        end();
    }

    /**
     * Overridable implementation
     * @param zon_dir {string} path to zon root
     * @param abs_path {string} abs path
     * @param stat {fs.Stats} path stat
     * @return {Path_base}
     * @private
     */
    _create_child(zon_dir, abs_path, stat) {
        return new this.constructor(zon_dir, abs_path, stat);
    }

    /**
     * @param e_name {'add'|'addDir'|'change'|'unlink'|'unlinkDir'}
     * @param path {string}
     * @param stats {fs.Stats}
     * @return {Promise<void>}
     * @private
     */
    async _on_file_change(e_name, path, stats) {
        switch (e_name) {
            case "add":
            case "addDir":
                let child = new this.constructor(this.zon_dir, path, stats);
                child._recalc_children(true);
                await child.additional_init();
                return;

            case "unlink":
            case "unlinkDir":
                let parent = all_files.get(path)?.parent;
                all_files.delete(path);
                parent?._recalc_children(true);
                break;

            case "change":
                await this.on_path_change();
                await this.after_path_changed();
                break;
        }
    }

    /**
     * Called when changes need to be sent to client
     * @return {Promise<void>}
     */
    async after_path_changed() {

    }

    async on_path_change() {
    }

    /**
     * @param name {string}
     * @param reduce {(array)=>any}
     * @return {any}
     * @private
     */
    _get(name, reduce) {
        if (!this.is_folder)
            return this[name];
        if (!reduce)
            reduce = arr => arr.find(Boolean);

        const direct = this.children.filter(x => x.is_folder);
        return reduce(direct.map(x => x[name]));
    }

    _set(name, value) {
        if (!this.is_folder && this[name] != value) {
            this[name] = value;
            return true;
        }
    }

    async _set_w_notify(name, value) {
        if (this._set(name, value))
            await this.after_path_changed();
    }

    /**
     * @return {TreeFile}
     */
    toJSON() {
        /** @type {TreeFile}*/
        const res = {
            filename: path.basename(this.abs_path),
            fullpath: this.abs_path,
            types: []
        };
        if (this.is_folder) {
            res.types.push('folder');
            res.children = this.children.map(x => x.toJSON());
        }
        if (this.is_hidden)
            res.types.push('hidden');
        return res;
    }
}