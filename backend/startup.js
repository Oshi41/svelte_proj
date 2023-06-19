import * as Gluon from '@gluon-framework/gluon';
import path from 'path';
const default_csp = 'default-src * self blob: data: gap:; style-src * self "unsafe-inline" blob: data: gap:;' +
'script-src * "self" "unsafe-eval" "unsafe-inline" blob: data: gap:; object-src * "self" blob: data: gap:;' +
'img-src * self "unsafe-inline" blob: data: gap:; connect-src self * "unsafe-inline" blob: data: gap:;' +
'frame-src * self blob: data: gap:;'

const main = async ()=>{
    let f_path = path.resolve('./dist/index.html'); // running from root

    await Gluon.open(f_path, {
        allowHTTP: true,
        localCSP: default_csp,
        allowNavigation: true,
        windowSize: [800, 600]
    });
};

main();