<script context="module">
    import {setContext} from 'svelte'
    import {get, writable} from 'svelte/store'
    import * as yrv from 'yrv';
    import {find_base_path} from '../lib/yrv_utils.js';

    export const ctx_name = 'current_route_path';

    export const Router = yrv.Router;

    /**
     * @param str {string}
     * @return {string}
     */
    const sanitize_value = str=>{
        str = str.replace(/\\/g, '/').replace(/\/+/g, '/') || '';
        let exclude = '* :'.split(' '); // rm parameters and masks
        str = str.split('/').filter(Boolean).filter(x=>exclude.every(k=>!x.includes(k))).join('/');
        return '/'+str;
    }

    /**
     * @param ctx {Map}
     * @param path {string}
     * @return {string|*}
     */
    const get_yrv_route_path = (ctx, path)=>{
        let route_path = find_base_path(ctx, 'routePath');

        if (!path)
            path = '/';

        if (!route_path||route_path==path||route_path=='/')
            return path;

        if (path=='/')
            return route_path;

        return route_path+path;
    };
    /**
     * @param ctx {Map}
     * @return {string}
     */
    const get_inner_route_path = (ctx, path)=>{
        let context = ctx.get(ctx_name);
        if (!context)
            return path;
        return get(context.full_path)+path;
    };

    /**
     * @param ctx {Map}
     * @param path {string}
     */
    export const get_full_path = (ctx, path = '')=>{
        return sanitize_value(get_inner_route_path(ctx, path)||get_yrv_route_path(ctx, path)||'');
    };

    /**
     * @param ctx {Map}
     * @param path {string}
     * @return {string|*}
     */
    export const set_full_path = (ctx, path)=>{
        let url = get_full_path(ctx, path);
        setContext(ctx_name, {
            full_path: writable(url),
        });
        return url;
    }
</script>

<script>
    import {Route} from 'yrv';
    import {getAllContexts} from 'svelte';

    set_full_path(getAllContexts(), $$props.path);
    export let router;
</script>

<Route {...$$props} {router}>
    {#if (!$$props.component)}
        <slot {...$$props}/>
    {/if}
</Route>