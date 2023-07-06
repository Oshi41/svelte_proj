import './console_patch.js';
import {get_zon_folders} from './z_env.js';
import path from "path";
import fs from "fs";

const main = async () => {
    const map = await get_zon_folders();
    let arr = await Promise.all([map.get('.zon')(), map.get('zon1')()]);
    for (let zdir of arr) {
        let data = zdir.toJSON();
        let json = JSON.stringify(data, null, 2);
        let file = path.resolve('test_data', path.basename(zdir.root) + '.json');
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, json, 'utf8');
    }
};
main();