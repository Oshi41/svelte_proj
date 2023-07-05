import {writable, get} from 'svelte/store';
import {hasContext, getContext, setContext} from 'svelte';
import {
    date_format,
    is_store,
    get as get_prop,
    set as set_prop
} from '../../lib/utils.js';

const parse_obj_no_err = str=>{
    if (!str)
        return {};

    try{
        let json = JSON.parse(str);
        return json
    } catch(e){
        console.warn('JSON deserialize:', e);
        return {};
    }
}

/**
 * @param lc_key {string} - unique key for local storage
 * @param data {any} default data
 * @param save_props {string} - prop names separated with ' ' which we want to save
 */
export const lc_json_writable = (lc_key, data = {}, save_props = '')=>{
    if (typeof localStorage=='undefined'|| typeof window=='undefined')
        throw new Error('Environment does not support local storage');

    let save_all = save_props=='all';

    if (!save_all&& typeof save_props=='string'){
        save_props = save_props.split(' ');
    }

    Object.assign(data||{}, parse_obj_no_err(localStorage.getItem(lc_key)));
    const store = writable(data);
    const {subscribe, set, update} = store;
    const save_to_lc = value=>{
        let result;
        if (!save_all){
            result = {};
            save_props.map(x=>x.split('.'))
            .forEach(x=>set_prop(result, get_prop(value, [...x]), [...x]));
        } else{
            result = value;
        }
        let json = JSON.stringify(result);
        localStorage.setItem(lc_key, json);
    };
    const custom_store = {
        subscribe,
        set: val=>{
            set(val);
            save_to_lc(get(store));
        },
        update: cb=>{
            update(cb);
            save_to_lc(get(store));
        }
    };
    return custom_store;
};

/**
 * @param lc_key {string} - unique key for local storage
 * @param data {any} default data
 * @param save_props {string} - prop names separated with ' ' which we want to save
 */
export const lc_json_writable_store = (lc_key, data = {}, save_props = '')=>{
    let store = getContext(lc_key);
    if (is_store(store))
        return store;

    return setContext(lc_key, lc_json_writable(lc_key, data, save_props));
};

/**
 * @param selector {HTMLElementTagNameMap}
 * @param style {CSSStyleDeclaration}
 * @return {function(HTMLElement, any): {update: function(any)}}
 */
export const runtime_set_style = (selector, style)=>node=>{
    let target = node.ownerDocument.querySelector(selector);
    if (target?.style)
        Object.assign(target.style, style);
}