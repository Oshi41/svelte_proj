import * as Gluon from '@gluon-framework/gluon';
import {get_zon_folders} from './z_env.js';
import os from 'os';
const default_csp = 'default-src * self blob: data: gap:; style-src * self "unsafe-inline" blob: data: gap:;' +
'script-src * "self" "unsafe-eval" "unsafe-inline" blob: data: gap:; object-src * "self" blob: data: gap:;' +
'img-src * self "unsafe-inline" blob: data: gap:; connect-src self * "unsafe-inline" blob: data: gap:;' +
'frame-src * self blob: data: gap:;'
let zon_envs = [];

const main = async ()=>{
    let json;
    try {
        zon_envs = await get_zon_folders();
        json = await zon_envs[0].toJSON();
    } catch (e) {
        console.error('CRIT:', e);
        return;
    }
    const window = await Gluon.open('./dist/index.html', {
        allowHTTP: true,
        localCSP: default_csp,
        allowNavigation: true,
        windowSize: [800, 600]
    });

    window.ipc.get_username = ()=>os.userInfo().username;
    window.ipc.get_zon_dirs = ()=>zon_envs.map(x=>({dirname: x.dirname}));
    window.ipc.get_zon_dir = async name => await zon_envs.filter(x => x.dirname == name)?.toJSON();
};

main();