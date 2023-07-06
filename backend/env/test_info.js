import fs from 'fs';
import {Path_base} from "./path_base.js";
import {get_db} from "../utils.js";
import {maxBy} from "../../lib/utils.js";

const props = 'avg fail success is_selenium is_mocha is_ignored last_error last_run_date'.split(' ');
const not_null_reduce = arr=>arr.find(Boolean);
const sum_reduce = arr => arr.filter(Number.isFinite).reduce((p, c) => p + c, 0);
const avg_reduce = arr => {
    arr = arr.filter(Number.isFinite);
    return sum_reduce(arr) / arr.length;
};


export class Test_info extends Path_base {
    constructor(...props) {
        super(...props);

        this._setup_tree_prop('is_selenium');
        this._setup_tree_prop('is_mocha');
        this._setup_tree_prop('is_ignored');

        this._setup_tree_prop('avg', avg_reduce);
        this._setup_tree_prop('fail', sum_reduce);
        this._setup_tree_prop('success', sum_reduce);

        this._setup_tree_prop('last_error', not_null_reduce);
        this._setup_tree_prop('last_run_date', maxBy);
    }

    /**
     * @return {Promise<{ignored: IgnoredTest[], runs: TestRun[]}>}
     */
    async get_file_test_type() {
        if (!this.abs_path.endsWith('.js'))
            return;
        const runs = [], ignored = [];
        const content = await fs.promises.readFile(this.abs_path);
        const type = /^describe\(/g.test(content) || content.includes(' describe(')
            ? content.includes('selenium.') ? 'selenium' : 'mocha'
            : 'file';
        runs.push({
            type,
            result: 'init',
            start: new Date(),
            file: this.relative_path,
        });
        return {runs, ignored};
    }

    /**
     * @param runs {TestRun[]}
     * @param ignored {IgnoredTest[]}
     * @private
     */
    async _setup_from_test(runs, ignored) {
        if (this.is_folder)
            return;

        let to_return;

        runs = runs.filter(x => x.file == this.relative_path);
        ignored = ignored.filter(x => x.file == this.relative_path);
        if (!runs.length) {
            const f_type = await this.get_file_test_type();
            if (!f_type)
                return;
            runs = f_type.runs;
            ignored = f_type.ignored;
            to_return = f_type.runs[0];
        }

        const all_runs = runs.filter(x => x.result == 'success' || x.result == 'fail');
        const success_runs = all_runs.filter(x => x.result == 'success');
        const file_type = runs.find(x => x.result == 'init').type;
        const last_run = maxBy(runs, x=>x.start);

        this.is_selenium = file_type == 'selenium';
        this.is_mocha = file_type == 'mocha';

        this.success = success_runs.length;
        this.fail = all_runs.length - this.success;
        this.avg = avg_reduce(success_runs.map(x => x.end - x.start));
        this.last_error = last_run?.result == 'fail' ? last_run.error : undefined;
        this.last_run_date = last_run?.start;

        this.is_ignored = !!ignored.length;
        return to_return;
    }

    async _zon_init() {
        super._zon_init();

        let end = this.time('init database');
        /** @type {{ignored: Nedb<IgnoredTest>, runs: Nedb<TestRun>}}*/
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
        end();
        end = this.time('read all database');
        const [runs, ignored] = await Promise.all([
            this.db.runs.findAsync({}),
            this.db.ignored.findAsync({}),
        ]);
        end();

        end = this.time('setup tests');
        let test_results = await Promise.all(this.flat_children.map(x => x._setup_from_test?.(runs, ignored)));
        test_results = test_results.filter(Boolean);
        if (test_results.length)
            await this.db.runs.insertAsync(test_results);

        this.db.runs.on('add', async docs => {
            end = this.time(`[DATABASE] Handle ${docs.length} new runs`);
            const flat = this.flat_children;
            docs = docs.map(x => flat.find(f => f.relative_path == x.file)).filter(Boolean);
            const q = {file: {$in: docs.map(x => x.relative_path)}};
            const [runs, ignored] = Promise.all(
                this.db.runs.findAsync(q),
                this.db.ignored.findAsync(q),
            );
            docs.forEach(x => x._setup_from_test(runs, ignored));
            end();
        });
        end();
    }

    toJSON() {
        let json = super.toJSON();
        for (let prop of props) {
            let val = this[prop];
            const types = 'string boolean object';
            if (types.includes(typeof val) || Number.isFinite(val))
                json[prop] = val;
        }
        return json;
    }
}