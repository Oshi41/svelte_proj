<script>
    import Route from '../route.svelte';
    import {ctx_name} from './panel.svelte';
    import {getContext, onDestroy} from "svelte";
    export let text;
    const {add, rm} = getContext(ctx_name);
    if (!add || !rm)
        throw new Error('<Tab /> should use only inside <TabPanel />');

    const {path} = $$restProps;

    add({path, text});
    onDestroy(()=>rm(path));
</script>

<Route {...$$restProps}>
    <slot/>
</Route>