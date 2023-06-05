import {is_store} from '../utils.js';
import {get} from 'svelte/store';

/**
 * @param contexts {Map}
 * @param prop {string}
 * @return {any | undefined}
 */
export const find_base_path = (contexts, prop = 'basePath')=>{
    let res = Array.from(contexts?.values()).map(x=>x?.[prop]).find(x=>is_store(x));
    res = res && get(res);
    if (res == '/')
        res = '';
    return res;
};