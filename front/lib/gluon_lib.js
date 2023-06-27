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

    return [{dirname: 'zon1'}];
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