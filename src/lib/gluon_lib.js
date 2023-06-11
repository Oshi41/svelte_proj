import {sleep} from '../utils.js';
/**
 * Request username from Gluon backend
 * @return {Promise<string>}
 */
export const get_username = async () => {
    return 'arkadii';
};

/**
 * Checks if authorized
 * @return {Promise<boolean>}
 */
export const is_authorized_async = async () => {
    return true;
};

/**
 * Send with auth
 * @param input {RequestInfo | URL}
 * @param init? {RequestInit}
 * @return {Promise<Response>}
 */
export const wbm_fetch = async (input, init) => {
    throw new Error('not implemented');
};

/**
 * Returns all zon dirs with brief meta
 * @return {Promise<[]>}
 */
export const get_zon_dirs = async () => {
    return [
        {dirname: '.zon'},
        {dirname: 'zon1'},
    ]
};

/**
 * @typedef {Object} File
 * @property {string} filename - base name
 * @property {string} fullpath - full path using as ID
 * @property {Array<'selenium' | 'mocha' | 'folder' | 'ignored' | 'running' | 'selenium'>} types
 * mocha - file contains mocha tests / directory contains files with mocha test
 * selenium - file contains selenium tests / directory contains files with selenium test
 * ignored - file/folder added to use ignored list
 * running - test is running / dir contains running tests
 * @property {Array<File> | undefined} - Folder children
 * @property {number} success? - total success runs
 * @property {number} fail? - total fail runs
 * @property {number} avg? - avg run time
 * @property {boolean} last_run_failed? - last test run was failed
 * @property {Date} last_run_date? - last test run date
 */

export const get_zon_dir = async dirname => {
    return {
        dirname,
        root: {
            filename: 'pkg',
            fullpath: '/var/log/pkg',
            types: 'folder mocha selenium'.split(' '),
            children: [
                {
                    filename: 'child',
                    types: 'selenium ignored'.split(' '),
                    fullpath: '/var/log/pkg/child',
                },
                {
                    filename: 'child 1',
                    types: 'mocha running'.split(' '),
                    fullpath: '/var/log/pkg/child 1',
                    success: 1,
                    fail: 1,
                    avg: 12563356,
                },
                {
                    filename: 'child 2',
                    types: 'folder'.split(' '),
                    fullpath: '/var/log/pkg/child 2',
                },
                {
                    filename: 'child 2',
                    types: 'mocha ignore'.split(' '),
                    fullpath: '/var/log/pkg/child 2',
                }
            ],
        }
    }
};

/**
 *
 * @param fn {Function<Array>}
 */
export const subscribe_on_file_upd = (fn)=>{
    return {
        unsubscribe: ()=>{}
    };
}

/**
 * @param msg {string}
 * @param ctx {any}
 * @return {Promise<void>}
 */
export const send_msg = async (msg, ctx)=> {

}