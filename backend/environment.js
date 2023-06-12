const fs = require('fs');
const os = require('os');
const path = require('path');
const {get_db} = require('./utils.js');

/**
 * @typedef {Object} TestRun
 * @property {string} file zon-relative path
 * @property {Date} start start of current test file
 * @property {Date} end end of current test file
 * @property {'init' | 'success' | 'fail'} result task result status
 * @property {string} error? task error
 * @property {'mocha' | 'selenium'} type test type
 */

/**
 * @typedef {Object} IgnoredTest
 * @property {string} file zon-relative path
 * @property {string} ignore_reason why ignoring test
 */

/**
 * Searches for zon folders
 * @return {Promise<string[]>}
 */
const find_zon_folders = async () => {
    let dir = os.homedir(), result = [];
    for (let dirname of (await fs.promises.readdir(dir))) {
        let zon_dir = path.join(dir, dirname)
        let filename = path.join(zon_dir, 'CVS', 'Repository');
        if (fs.existsSync(filename)) {
            let txt = (await fs.promises.readFile(filename, 'utf8')).trim();
            if (txt == 'zon')
                result.push(zon_dir);
        }
    }
    return result;
};

class ZonWatched {
    constructor(abs_path) {
        this.zon_root = abs_path;
        this.watch_dir = path.join(abs_path, 'pkg');
        this.files = new Map();
        this.builds = new Map();
    }

    _merge(key, val, {force = true}) {
        if (!this.files.has(key))
            this.files.set(key, {});

        if (Array.isArray(val))
            val = Object.assign(...val);

        let args = [this.files.get(key), val];
        if (force)
            args[1] = Object.assign(val, args[0]); // apply non-undefined props
        Object.assign(...args);
    }

    _add_relation(parent_key, child_key) {
        let parent = this.files.get(parent_key);
        if (parent?.children) {
            let child = this.files.get(child_key);
            if (child)
                parent.children.push(child);
        }
    }

    async init() {
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

    async recheck_meta(){
        this.builds.clear();
        let builds = (await fs.promises.readdir(this.zon_root)).filter(x=>x.startsWith('build'));
        for (let build of builds) {
            let name = build.split('.')[1];
            let stat = await fs.promises.stat(path.join(this.zon_root, build));
            this.builds.set(name, {name, last_change: stat.mtime});
        }
    }

    async handle_file_change(e, filename) {
        await this.read_file(filename);
    }

    async get_test_type(filename) {
        if (filename.endsWith('.js')) {
            let txt = await fs.promises.readFile(filename, 'utf8');
            if (txt.includes('describe('))
                return txt.includes('selenium.') ? 'selenium' : 'mocha';
        }
    }

    async read_file(filename) {
        let stat = await fs.promises.stat(filename);

        if (stat.isFile()) {
            let test_runs = await this.test_runs_db.findAsync({file: filename});
            if (test_runs?.length)
            {
                let run_types = 'success fail'.split(' ');
                let all_runs = test_runs.filter(x=>run_types.includes(x.status));
                let success_runs = test_runs.filter(x=>x.status == 'success');
                let last_run = all_runs.sort((a, b) => a.end - b.end)[0];
                this._merge(filename, {
                    type: test_runs[0].type,
                    success: success_runs.length,
                    fail: all_runs.length - success_runs.length,
                    avg: success_runs.reduce((s, x)=>s+(x.end - x.start)) / success_runs.length,
                    ...(last_run && {
                        last_run_failed: last_run.status == 'fail',
                        last_run_date: last_run?.end,
                    }),
                });
            }

            let res = await this.ignored_tests_db.findOneAsync({file: filename});
            if (res)
                this._merge(filename, [res, {ignored: true}]);

            // not ignored and do not have test type
            if (!res && !this.files.get(filename)?.type) {
                let type = await this.get_test_type(filename)
                if (type) {
                    await this.test_runs_db.insertAsync({
                        file: filename, start: new Date(), type,
                        last_result: 'init'
                    });
                    this._merge(filename, {type});
                }
            }

            let test_type = this.files.get(filename)?.type

            if (!test_type)
                this._merge(filename, {type: 'file'});
            else if (test_type == 'selenium')
                this._merge(path.dirname(filename), {has_selenium: true});
            else if (test_type == 'mocha')
                this._merge(path.dirname(filename), {has_mocha: true});

            this._add_relation(path.join(filename), filename);
        }

        if (stat.isDirectory()) {
            this._merge(filename, {type: 'folder', children: []}, {force: false});

            for (let child_path of (await fs.promises.readdir(filename))) {
                child_path = path.join(child_path, child_path);
                await this.read_file(child_path);
            }

            this._add_relation(path.join(filename), filename);
        }
    }

    build_tree() {
        let root = {...this.files.get(this.watch_dir)};
        /**
         * @param node {TestRun}
         * @return {File}
         */
        const convert_to = node => {
            let types = [];
            if ('folder selenium mocha'.split(' ').includes(node.type))
                types.push(node.type);
            if (node.has_selenium)
                types.push('selenuim');
            if (node.has_mocha)
                types.push('mocha');
            if (node.ignored)
                types.push('ignore');

            let children = node?.children?.map(x=>convert_to(x));

            return {
                fullpath: path.join(this.zon_root, node.file),
                filename: path.basename(node.file),
                types,
                ... (node.last_run_date && {
                    avg: node.avg,
                    fail: node.fail,
                    success: node.success,
                    last_run_date: node.last_run_date,
                    last_run_failed: node.last_run_failed,
                }),
                ...(children && {children}),
            };
        };
        return convert_to(root);
    }
}