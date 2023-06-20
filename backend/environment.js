// import fs from 'fs';
// import os from 'os';
// import path from 'path';
// import {get_db} from './utils.js';
//
// const is_zon_root = async z_dir => {
//     let file_or_folder = path.join(z_dir, 'pkg');
//     if (!fs.existsSync(file_or_folder))
//         return false;
//
//     file_or_folder = path.join(z_dir, 'CVS', 'Repository');
//     if (fs.existsSync(file_or_folder))
//         return false;
//
//     try {
//         let txt = await fs.promises.realpath(file_or_folder);
//         txt = txt.trim();
//         if (txt != 'zon')
//             return false;
//     } catch (e) {
//         console.error('Error during zon dir check:', e);
//         return false;
//     }
//     return true;
// };

// class ZonDir {
//     constructor(abs_path) {
//         this.dirname = path.basename(abs_path);
//         this.zon_root = abs_path;
//         this.watch_dir = path.join(abs_path, 'pkg');
//         this.files = new Map();
//         this.builds = new Map();
//     }
//
//     async _init(){
//
//     }
// }



    //     , result = [];
//     for (let dirname of (await fs.promises.readdir(dir))) {
//         let zon_dir = path.join(dir, dirname)
//         if (!fs.existsSync(path.join(zon_dir, 'pkg')))
//             continue;
//
//         let filename = path.join(zon_dir, 'CVS', 'Repository');
//         if (fs.existsSync(filename)) {
//             let txt = (await fs.promises.readFile(filename, 'utf8')).trim();
//             if (txt == 'zon')
//                 result.push(new ZonWatched(zon_dir))
//         }
//     }
//     await Promise.all(result.map(x=>x.init())); // init all folders
//     return result;
}

//

//

//
// /**
//  * @param fn {Promise}
//  */
// const wrap = (fn, def_val, msg = '') =>fn.catch(e=>{
//     console.error('Error during promise', msg);
//     console.error(e);
//     return def_val;
// })
//
// /**
//  * Searches for zon folders
//  * @return {Promise<string[]>}
//  */
// export const get_zon_folders = async ()=>{

// }
//
// export class ZonWatched {

//
//     _merge(key, val, {force = true}) {
//         if (!this.files.has(key))
//             this.files.set(key, {});
//
//         if (Array.isArray(val))
//             val = Object.assign(...val);
//
//         let args = [this.files.get(key), val];
//         if (force)
//             args[1] = Object.assign(val, args[0]); // apply non-undefined props
//         Object.assign(...args);
//     }
//
//     _add_relation(parent_key, child_key) {
//         let parent = this.files.get(parent_key);
//         if (parent?.children) {
//             let child = this.files.get(child_key);
//             if (child)
//                 parent.children.push(child);
//         }
//     }
//
//     async init() {

//     }
//
//     async recheck_meta(){
//         this.builds.clear();
//         let builds = (await fs.promises.readdir(this.zon_root)).filter(x=>x.startsWith('build'));
//         for (let build of builds) {
//             let name = build.split('.')[1];
//             let stat = await fs.promises.stat(path.join(this.zon_root, build));
//             this.builds.set(name, {name, last_change: stat.mtime});
//         }
//     }
//
//     async handle_file_change(e, filename) {
//         await this.read_file(filename);
//     }
//

//
//     async read_file(filename) {
//         let stat = await fs.promises.stat(filename);
//
//         if (stat.isFile()) {
//             let test_runs = await this.test_runs_db.findAsync({file: filename});
//             if (test_runs?.length)
//             {
//                 let run_types = 'success fail'.split(' ');
//                 let all_runs = test_runs.filter(x=>run_types.includes(x.status));
//                 let success_runs = test_runs.filter(x=>x.status == 'success');
//                 let last_run = all_runs.sort((a, b) => a.end - b.end)[0];
//                 this._merge(filename, {
//                     type: test_runs[0].type,
//                     success: success_runs.length,
//                     fail: all_runs.length - success_runs.length,
//                     avg: success_runs.reduce((s, x)=>s+(x.end - x.start)) / success_runs.length,
//                     ...(last_run && {
//                         last_run_failed: last_run.status == 'fail',
//                         last_run_date: last_run?.end,
//                     }),
//                 });
//             }
//
//             let res = await this.ignored_tests_db.findOneAsync({file: filename});
//             if (res)
//                 this._merge(filename, [res, {ignored: true}]);
//
//             // not ignored and do not have test type
//             if (!res && !this.files.get(filename)?.type) {
//                 let type = await this.get_test_type(filename)
//                 if (type) {
//                     await this.test_runs_db.insertAsync({
//                         file: filename, start: new Date(), type,
//                         last_result: 'init'
//                     });
//                     this._merge(filename, {type});
//                 }
//             }
//
//             let test_type = this.files.get(filename)?.type
//
//             if (!test_type)
//                 this._merge(filename, {type: 'file'});
//             else if (test_type == 'selenium')
//                 this._merge(path.dirname(filename), {has_selenium: true});
//             else if (test_type == 'mocha')
//                 this._merge(path.dirname(filename), {has_mocha: true});
//
//             this._add_relation(path.dirname(filename), filename);
//         }
//
//         if (stat.isDirectory()) {
//             this._merge(filename, {type: 'folder', children: []}, {force: false});
//
//             for (let child_path of (await fs.promises.readdir(filename))) {
//                 child_path = path.join(filename, child_path);
//                 await this.read_file(child_path);
//             }
//
//             this._add_relation(path.dirname(filename), filename);
//         }
//     }
//
//     build_tree() {
//         let root = {...this.files.get(this.watch_dir)};
//         /**
//          * @param node {TestRun}
//          * @return {File}
//          */
//         const convert_to = node => {
//             let types = [];
//             if ('folder selenium mocha'.split(' ').includes(node.type))
//                 types.push(node.type);
//             if (node.has_selenium)
//                 types.push('selenuim');
//             if (node.has_mocha)
//                 types.push('mocha');
//             if (node.ignored)
//                 types.push('ignore');
//
//             let children = node?.children?.map(x=>convert_to(x));
//
//             return {
//                 fullpath: path.join(this.zon_root, node.file),
//                 filename: path.basename(node.file),
//                 types,
//                 ... (node.last_run_date && {
//                     avg: node.avg,
//                     fail: node.fail,
//                     success: node.success,
//                     last_run_date: node.last_run_date,
//                     last_run_failed: node.last_run_failed,
//                 }),
//                 ...(children && {children}),
//             };
//         };
//         return convert_to(root);
//     }
// }