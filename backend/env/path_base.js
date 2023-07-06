import './console_patch.js';
import {watch} from "chokidar";
import fs from "fs";
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
    return l.pop()?.localeCompare(right?.pop()) || 0;
}

export class Path_base {
    constructor(zon_dor, abs_path, stat) {
        this.abs_path = abs_path;
        this.relative_path = path.relative(zon_dor, abs_path);
        this.stat = stat || fs.statSync(abs_path);
        if (this.is_folder) {
            /**
             * @type {string[]}
             * @private
             */
            this._children_keys = [];
            this._flat_children_keys = [];
            this.on_children_changed = () => {
                console.debug(`[${this.abs_path}] children changed`);
            };
            this.recache = debounce(() => {
                let children_keys = Array.from(all_files.keys())
                    .filter(x => x.startsWith(this.abs_path) && x != this.abs_path);
                let flat_children_keys = this._flat_children_keys
                    .filter(x => !path.relative(this.abs_path, x).includes('/'));

                if (sequence_equal(children_keys, this._children_keys, x => x.abs_path)
                    && sequence_equal(flat_children_keys, this._flat_children_keys, x => x.abs_path))
                    return;

                this._children_keys = children_keys;
                this._flat_children_keys = flat_children_keys;
                this.parent?.recache();
                this.on_children_changed();
            }, {timeout: 150});
        }
        all_files.set(this.abs_path, this);
        this.parent?.recache();
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
            let child = this._create_child(this.zon_dir, x, fs.statSync(x));
            all_files.set(x, child);
        });
        end();
        end = this.time('rest files init');
        for (let dir of dirs) {
            for (let abs_path of watched[dir].map(x => path.join(dir, x))) {
                let child = this._create_child(this.zon_dir, abs_path, fs.statSync(abs_path));
                all_files.set(abs_path, child);
            }
        }
        end();
        end = this.time('additional init');
        await sleep(150); // breath here for recache end
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
        this.constructor(zon_dir, abs_path, stat);
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
                let child = this._create_child(this.zon_dir, path, stats);
                all_files.set(path, child);
                return;

            case "unlink":
            case "unlinkDir":
                let parent = all_files.get(path)?.parent;
                all_files.delete(path);
                parent?.recache();
                break;

            case "change":
                await this.on_path_change();
                break;
        }
    }

    async on_path_change() {

    }

    /**
     * @param name {string} prop name
     * @param inner_name {string} backing prop name
     * @param reduce {function(arr: any[]): any} reduce fn
     * @return {*}
     * @private
     */
    _setup_tree_prop(name, reduce, inner_name){
        if (!inner_name)
            inner_name = '_'+name;
        if (reduce)
            reduce = arr=>arr.find();
        Object.defineProperty(this, name, {
            get() {
                if (!this.is_folder)
                    return this[inner_name];
                let children_vals = this.children.map(x => x[name]);
                return reduce(children_vals);
            },
            set(v) {
                if (!this.is_folder)
                    return this[inner_name] = v;
            }
        });
    }

    /**
     * @return {TreeFile}
     */
    toJSON(){
        const res = {
            filename: path.basename(this.abs_path),
            fullpath: this.abs_path,
            types: []
        };
        if (this.is_folder)
        {
            res.types.push('folder');
            res.children = this.children.map(x => x.toJSON());
        }
        return res;
    }
}