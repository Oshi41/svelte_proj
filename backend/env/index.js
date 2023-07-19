import os from "os";
import fs from "fs";
import path from "path";
import {lazy, repeat} from "../../lib/utils.js";
import {Cmd_path} from "./cmd_path.js";
import {Ipc_path} from "./ipc_path.js";
import {Path_base} from "./path_base.js";
import {Cvs_path} from "./cvs_path.js";
import {Build_path} from "./build_path.js";
import {Test_info} from "./test_info.js";
import {extend_classes} from "../utils.js";

/**
 * @class
 * @constructor
 * @param zon_dir {string} - absolute path to zon dir
 * @param abs_path {string} - absolute path to file/dir
 * @param stat? {fs.Stats} - file/dir stats
 *
 * @augments Cmd_path
 * @augments Ipc_path
 * @augments Path_base
 * @augments Cvs_path
 * @augments Build_path
 * @augments Test_info
 */
export const Z_filepath = extend_classes(Path_base, Cvs_path, Build_path, Test_info, Cmd_path, Ipc_path);

export const is_zon_root = async z_dir => {
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

export const get_zon_folders = async () => {
    const dir = os.homedir();
    let children = await fs.promises.readdir(dir)
        .then(arr => arr.map(s => path.join(dir, s)))
        .catch(e => {
            console.error('Cannot read directory:', e);
            throw e;
        });
    children = await Promise.all(children.map(x => is_zon_root(x).then(y => y ? x : undefined)));
    children = children.filter(Boolean).map(x => {
        return [path.basename(x), lazy(async () => {
            const pkg_path = path.join(x, 'pkg');
            let res = new Z_filepath(
                x,
                pkg_path,
                fs.statSync(pkg_path),
            );
            let json = res.toJSON();
            await res.zon_init(x);
            return res;
        })];
    });
    return new Map(children);
};
