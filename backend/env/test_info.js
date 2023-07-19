import fs from 'fs';
import {Path_base} from "./path_base.js";
import {get_db} from "../utils.js";
import {maxBy} from "../../lib/utils.js";
import {Build_path} from "./build_path.js";

const not_null_reduce = arr=>arr.find(Boolean);
const sum_reduce = arr => arr.filter(Number.isFinite).reduce((p, c) => p + c, 0);
const avg_reduce = arr => {
    arr = arr.filter(Number.isFinite);
    return sum_reduce(arr) / arr.length;
};


export class Test_info extends Path_base {
    constructor(...props) {
        super(...props);
    }

    get is_selenium(){
        return this._get('_is_selenium');
    }
    set is_selenium(value){
        return this._set_w_notify('_is_selenium', value);
    }

    get is_mocha(){
        return this._get('_is_mocha');
    }
    set is_mocha(value){
        return this._set_w_notify('_is_mocha', value);
    }

    get is_ignored(){
        return this._get('_is_ignored');
    }
    set is_ignored(value){
        return this._set_w_notify('_is_ignored', value);
    }

    get avg(){
        return this._get('_avg', avg_reduce);
    }
    set avg(value){
        return this._set_w_notify('_avg', value);
    }

    get fail(){
        return this._get('_fail', sum_reduce);
    }
    set fail(value){
        return this._set_w_notify('_fail', value);
    }

    get success(){
        return this._get('_success', sum_reduce);
    }
    set success(value){
        return this._set_w_notify('_success', value);
    }

    get last_error(){
        return this._get('_last_error', not_null_reduce);
    }
    set last_error(value){
        return this._set_w_notify('_last_error', value);
    }

    get last_run_date(){
        return this._get('_last_run_date', maxBy);
    }
    set last_run_date(value){
        return this._set_w_notify('_last_run_date', value);
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
        if (this.is_selenium)
            json.types.push('selenium');
        if (this.is_mocha)
            json.types.push('mocha');
        if (this.is_ignored)
            json.types.push('ignored');
        if (Number.isFinite(this.avg))
            json.avg = this.avg;
        if (Number.isFinite(this.success))
            json.success = this.success;
        if (Number.isFinite(this.fail))
            json.fail = this.fail;
        if (this.last_error)
            json.last_error = this.last_error;
        if (this.last_run_date instanceof Date)
            json.last_run_date = this.last_run_date;
        return json;
    }
}