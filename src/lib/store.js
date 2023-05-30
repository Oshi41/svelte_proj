import {writable, get} from 'svelte/store';
import {hasContext, getContext, setContext} from 'svelte';
import {date_format} from '../utils.js';

/**
 *
 * @param key {string}
 * @param data {any}
 * @param saved_props {Array<string>}
 * @return {Writable<any>}
 */
export const use_reactive = (key, data = {}, saved_props = [])=>{
    const can_save = typeof window!='undefined'&& typeof localStorage!='undefined';
    if (can_save){
        try{
            let json = localStorage.getItem(key);
            json = JSON.parse(json);
            Object.assign(data||{}, json);
        } catch(e){
            console.warn('Error during restoring values from local storage:', e);
        }
    } else{
        console.warn('Environment does not support local storage');
    }
    const store = writable(data);
    const {subscribe, set, update} = store;
    const save_to_lc = ()=>{
        if (!can_save|| !saved_props?.length)
            return;
        let actual_value = get(store);
        let res = saved_props.reduce((prev, x)=>Object.assign(prev, {[x]: actual_value[x]}), {});
        localStorage.setItem(key, JSON.stringify(res));
    };
    const custom_store = {
        subscribe,
        set: val=>{
            set(val);
            save_to_lc();
        },
        update: cb=>{
            update(cb);
            save_to_lc();
        }
    };
    return custom_store;
}


/**
 * @param data {any}
 * @param key {string}
 * @param saved_props {Array<string>}
 * @return {Writable<any>}
 */
export const use_reactive_ctx = (key, data = {}, saved_props = [])=>{
    if (!hasContext(key)){
        setContext(key, use_reactive(key, data, saved_props));
    }
    return getContext(key);
};