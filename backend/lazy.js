import {promisify} from '../lib/utils.js'

export const lazy = fn=>{
    let val, promise;
    return async()=>{
        if (val)
            return val;
        if (promise)
            return promise;

        promise = promisify(fn).finally(()=>promise = null);
        return val = await promise;
    };
};