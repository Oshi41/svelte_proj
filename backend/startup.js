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
 * @type {ZonDir[]}
 */
let zon_envs = [];

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
    window.ipc.get_zon_dirs = ()=>zon_envs.map(x=>({dirname: x.dirname}));
    window.ipc.get_zon_dir = name => zon_envs.find(x => x.dirname == name)?.toJSON();
};

const save_file = ()=>{
    let data = zon_envs[0].toJSON();
    let json = JSON.stringify(data, null, 2);
    let file = path.resolve('dist', 'test_data', zon_envs[0].dirname+'.json');
    fs.writeFileSync(file, json, 'utf8');
}

main();