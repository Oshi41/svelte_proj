const support_gluon = typeof Gluon == 'object';

/**
 * Request username from Gluon backend
 * @return {Promise<string>}
 */
export const get_username = async () => {
    if (support_gluon)
        return Gluon.ipc.get_username();

    return 'unknown';

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
    if (support_gluon)
        return await Gluon.ipc.get_zon_dirs();

    return [{dirname: 'zon1'}, {dirname: '.zon'}];
};

export const get_zon_dir = async dirname => {
    if (support_gluon)
        return await Gluon.ipc.get_zon_dir(dirname);

    let filepath = `../../dist/test_data/${dirname}.json`;
    let module = await import(filepath);
    return module;
};

/**
 *
 * @param type {string} - message type id
 * @param fn {Function<any>} - receive handler
 */
export const subscribe_on_msg = (type, fn)=>{
    if (support_gluon)
    {
        Gluon.ipc.on(type, fn);
        return {
            unsubscribe: ()=>{
                Gluon.ipc.removeListener(type, fn);
            }
        };
    }
}

/**
 * @param msg {string}
 * @param ctx {any}
 * @return {Promise<void>}
 */
export const send_msg = async (msg, ctx)=> {
    if (support_gluon)
        return await Gluon.ipc.send(msg, ctx);
}

export const use_ipc_fn = (name) => {
    if (support_gluon)
        return Gluon.ipc[name];

    return ()=>{};
}

export const path_dirname = async (path) => {
    if (support_gluon)
        return await Gluon.ipc.dirname(path);

    path = path.split('/');
    path.pop();
    return path.join('/');
};