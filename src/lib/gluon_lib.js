import sp from 'synchronized-promise';

/**
 * Request username from Gluon backend
 * @return {Promise<string>}
 */
export const get_username = async()=>{
    return 'arkadii';
};

/**
 * Checks if authorized
 * @return {Promise<boolean>}
 */
export const is_authorized_async = async()=>{
    return true;
};

/**
 * Send with auth
 * @param input {RequestInfo | URL}
 * @param init? {RequestInit}
 * @return {Promise<Response>}
 */
export const wbm_fetch = async(input, init)=>{
    throw new Error('not implemented');
}

/**
 * Returns all zon dirs with brief meta
 * @return {Promise<[]>}
 */
export const get_zon_dirs = async()=>{
    return [
        {name: '.zon'},
        {name: 'zon1'},
    ]
}