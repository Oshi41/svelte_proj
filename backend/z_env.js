import fs from 'fs';
import os from 'os';
import path from 'path';
import {get_db, get_zon_rel_path} from './utils.js';

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

export class ZonDir {
    constructor(abs_path) {
        this.zon_root = abs_path;
        this.dirname = path.basename(abs_path);
        this.watch_dir = path.join(abs_path, 'pkg');
    }

    get_zon_rel_path(abs_path) {
        return path.relative(this.zon_root, abs_path);
    }
    async get_file_type (filename){
        let q_id = {last_result: 'init', file: await this.get_zon_rel_path(filename)};
        if (this.test_runs_db) {
            let file = await this.test_runs_db.findOneAsync(q_id);
            if (file)
                return file.type;
        }
        if (filename.endsWith('.js')) {
            let txt = await fs.promises.readFile(filename, 'utf8');
            if (/^describe\(/g.test(txt) || txt.includes(' describe(')) {
                let type = txt.includes('selenium.') ? 'selenium' : 'mocha';
                if (this.test_runs_db)
                    await this.test_runs_db.updateAsync(q_id, {...q_id, type}, {upsert: true});
                return type;
            }
            else
            {
                if (this.test_runs_db)
                    await this.test_runs_db.updateAsync(q_id, {...q_id, type: 'file'}, {upsert: true});
            }
        }
        return 'file';
    };
    
    async print_dbg_info() {
        let total = await this.files.countAsync({});
        let mocha = await this.files.countAsync({type: 'mocha'});
        let selenium = await this.files.countAsync({type: 'selenium'});
        let folders = await this.files.countAsync({type: 'folder'});
        console.debug(`[${this.dirname}] Scanned ${total} paths, [${folders}] folders, founded [${mocha}] mocha tests, `
        +`[${selenium}] selenium tests`);
    }

    async _init() {
        console.debug('Read', this.zon_root, 'folder');

        /** @type {Nedb} */
        this.files = await get_db(undefined, {
            indexes: [
                {fieldName: 'filename'},]
        }); // in memory db
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
        await this.files.removeAsync({}, {multi: true});
        let i = setInterval(() => this.print_dbg_info(), 1000);
        await this.read_file(this.watch_dir);
        // this.watcher = fs.watch(this.watch_dir, {encoding: 'utf8', recursive: true, persistent: true},
        //     this.handle_file_change);
        clearInterval(this.recheck_meta_i);
        this.recheck_meta_i = setInterval(this.recheck_meta, 1000 * 5);
        clearInterval(i);
        console.debug('FILE SCAN DONE');
        await this.print_dbg_info();
    }

    async read_file(abs_path) {
        if (!fs.existsSync(abs_path))
            return;

        let stat = await fs.promises.stat(abs_path).catch(e => {
            console.warn('Error during file read:', e);
        });
        const q_id = {filename: abs_path}, rel_q_id = {file: await get_zon_rel_path(abs_path)};
        const parent_q_id = {filename: path.dirname(abs_path)};

        if (stat?.isDirectory())
        {
            await this.files.updateAsync(q_id, {...q_id, type: 'folder', children: []}, {upsert: true});
            await this.files.updateAsync(parent_q_id, {$push: {children: abs_path}, $set: parent_q_id});
            let children = await fs.promises.readdir(abs_path)
            children = children.map(x => path.join(abs_path, x));
            await Promise.all(children.map(x => this.read_file(x)));
        } else if (stat?.isFile())
        {
            const type = await this.get_file_type(abs_path, this.test_runs_db);
            const runs = await this.test_runs_db.findAsync(rel_q_id);
            const ignore_info = await this.ignored_tests_db.findOneAsync(rel_q_id);
            await this.files.updateAsync(q_id, {
                $set: {
                    runs: runs || [],
                    ...ignore_info || {},
                    ...q_id, type,
                },
                $unset: {children: ''},
            }, {upsert: true});
            const upd = {$set: {}, $push: {children: abs_path}};
            if (type == 'mocha')
                upd.$set.has_mocha = true;
            if (type == 'selenium')
                upd.$set.has_selenium = true;
            if (ignore_info?.ignore_reason)
                upd.$set.has_ignored = true;

            await this.files.updateAsync(parent_q_id, upd);
        } else {
            console.warn(`Unknown file: ${abs_path}`);
        }
    }

    async handle_file_change(e, filename) {
        // todo
    }

    async recheck_meta() {

    }

    async toJSON() {
        let flat_tree_map = await this.files.findAsync({});
        console.debug('Total files:', flat_tree_map.length);
        flat_tree_map = new Map(flat_tree_map.map(x => [x.filename, x]));
        /**
         * @param node {{
         *     type: 'selenium' | 'mocha' | 'folder' | 'file',
         *     filename: string,
         *     has_mocha: boolean | undefined,
         *     has_selenium: boolean | undefined,
         *     has_ignored: boolean | undefined,
         *     runs: TestRun[],
         * }}
         * @return {File}
         */
        const _to_json = node => {
            const types = [];
            if ('selenium mocha folder'.split(' ').includes(node.type))
                types.push(node.type);
            'selenium mocha ignored'.split(' ').filter(x => node['has_' + x])
                .forEach(x => types.push(x));
            /*** @type {File}*/
            let test_info = {};
            if (node.runs?.length)
            {
                let [success, fail] = 'success fail'.split(' ')
                    .map(x=>node.runs.filter(r=>r.result == x));
                test_info.success = success.length;
                test_info.fail = fail.length;
                test_info.avg = [...success, ...fail].map(x=>x.end-x.start)
                    .reduce((sum, x)=>sum+x, 0) / (success.length + fail.length);
            }
            if (node.children?.length)
            {
                test_info.children = node.children.map(x=>flat_tree_map.get(x))
                    .filter(Boolean).map(x=>_to_json(x));
            }
            return {
                filename: path.basename(node.filename),
                fullpath: node.filename,
                types,
                ...test_info
            };
        };
        let root = _to_json(flat_tree_map.get(this.watch_dir));
        return {
            tree: [root],
        };
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
    result = result.slice(0, 1);
    await Promise.all(result.map(x => x._init()));
    return result;
}