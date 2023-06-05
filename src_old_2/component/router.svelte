<script>
    import {getContext, setContext} from 'svelte';
    import {SpaRouter} from 'svelte-router-spa';
    import {activeRoute} from 'svelte-router-spa/src/store.js';
    import Route from './route.svelte';
    import {writable} from 'svelte/store';
    import {select_recursive, WeakSet} from '../utils.js';

    const ctx_name = '_flat_routes';
    /** @type {Route[]}*/
    export let routes = [];
    export let options;
    const navigate = (all)=>SpaRouter(all, document.location.href, options).setActiveRoute();

    /** @type {Writable<WeakSet>}*/
    const flat_routes = getContext(ctx_name)||setContext(ctx_name, writable(new WeakSet()));
    const parents

    $: {
        navigate(routes);
        let all = select_recursive(routes, x=>x.nestedRoutes);
        all.forEach(x=>$flat_routes.add(x));
    }
</script>

<Route currentRoute={$activeRoute}/>
