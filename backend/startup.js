import './console_patch.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import * as Gluon from '@gluon-framework/gluon';
import {get_zon_folders} from './z_env.js';
const default_csp = 'default-src * self blob: data: gap:; style-src * self "unsafe-inline" blob: data: gap:;' +
'script-src * "self" "unsafe-eval" "unsafe-inline" blob: data: gap:; object-src * "self" blob: data: gap:;' +
'img-src * self "unsafe-inline" blob: data: gap:; connect-src self * "unsafe-inline" blob: data: gap:;' +
'frame-src * self blob: data: gap:;'
/**
 * @type {Map<string, Z_File_Or_Folder>}
 */
let zon_envs;

const main = async ()=>{
    zon_envs = await get_zon_folders().catch(e=> {
        console.error('CRIT:', e);
        throw e;
    });
    save_file();
    let file = path.resolve('dist', 'index.html');
    const window = await Gluon.open(file, {
        allowHTTP: true,
        localCSP: default_csp,
        allowNavigation: true,
        windowSize: [800, 600]
    });

    window.ipc.get_username = ()=>os.userInfo().username;
    window.ipc.get_zon_dirs = ()=>Array.from(zon_envs.keys()).map(x=>({dirname: x}));
    window.ipc.get_zon_dir = name => zon_envs.get(name)?.toJSON();
};

const save_file = ()=>{
    let t = console.time('saving zon dir');
    const [dir, zdir] = zon_envs.entries().next().value;
    let data = zdir.toJSON();
    let json = JSON.stringify(data, null, 2);
    let file = path.resolve('dist', 'test_data', path.basename(dir)+'.json');
    fs.writeFileSync(file, json, 'utf8');
    t();
}
main();