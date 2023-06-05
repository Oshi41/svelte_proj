<script>
    import {Route, navigateTo} from 'svelte-router-spa';
    import {removeSlash} from 'svelte-router-spa/src/lib/utils.js';
    import {getContext, hasContext, onMount, setContext} from 'svelte';
    import {writable, get as get_ctx} from 'svelte/store';
    import {set, get, find_paths} from '../utils.js';

    //
    //
    //
    //
    // const navigate = path=>{
    //     let base_paths = [];
    //     if (currentRoute?.name){
    //         let paths = removeSlash(currentRoute?.name, 'both').split('/').splice(0, -1);
    //         while(paths.length)
    //         {
    //             let parent = get($ctx, paths);
    //             if (parent)
    //                 base_paths.unshift(parent.name);
    //         }
    //     }
    //     let url = base_paths.join('/') + path;
    //     navigateTo(url);
    // };
    //
    // if (!hasContext(ctx_name)){
    //     setContext(ctx_name, {
    //         routes: writable({}),
    //         navigate,
    //     });
    // }
    //
    // let ctx = getContext(ctx_name);

    // $: {
    //     let cur_path = currentRoute?.name;
    //     if (cur_path?.length && ctx?.routes?.update){
    //         cur_path = removeSlash(currentRoute?.name, 'both');
    //         let paths = cur_path.split('/')
    //         /** @type {Writable} */
    //         let routes = ctx.routes;
    //         routes.update(value=>set(value, currentRoute, paths))
    //     }
    // }

    const ctx_name = '_routes';
    let parents;
    export let currentRoute;
    export let params;

    const ctx = getContext(ctx_name)||setContext(ctx_name, {
        routes: writable({}),
        navigate: function(path){
            navigateTo(path)
        },
    });
    const update_by_path = (path)=>{
        if (!parents)
            return;
        let paths = removeSlash(parents.join('/')+path, 'both').split('/');
        ctx.routes.update(v=>set(v, currentRoute, paths));
    };
    ctx.routes.subscribe(val=>{
        parents = [];
        let paths = find_paths(val, currentRoute)
    });
    $: currentRoute?.name?.length && update_by_path(currentRoute.name);

    // $: {
    //     let cur_path = currentRoute.name;
    //     let routes = ctx.routes;
    //     if (cur_path?.length && routes?.update)
    //     {
    //         cur_path = removeSlash(currentRoute?.name, 'both').split('/');
    //         console.log(cur_path);
    //         set($routes, currentRoute, cur_path);
    //     }
    // }
</script>

<Route {currentRoute} {params}/>
