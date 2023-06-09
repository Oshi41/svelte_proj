<script>
    import Route, {check_route, get_route_ctx, url_store} from '../route.svelte';
    import {ctx_name} from './panel.svelte';
    import {getContext, onDestroy} from "svelte";

    export let text;
    export let path;


    const {add, rm} = getContext(ctx_name);
    if (!add || !rm)
        throw new Error('<Tab /> should use only inside <TabPanel />');

    add({path, text});
    onDestroy(() => rm(path));


</script>

<Route {...$$restProps} {path}>
    <slot/>
</Route>
