<script context="module">
    export const ctx_name = '_tab_panel';
</script>

<script>
    import {ContentSwitcher, Switch} from "carbon-components-svelte";
    import {get_route_ctx, check_route} from '../route.svelte';
    import {onMount, setContext} from "svelte";

    let routes = new Map(), selectedIndex;
    const {navigate_to} = get_route_ctx();
    const onclick = pathname=>async () => {
        await navigate_to({pathname});
    };
    setContext(ctx_name, {
        add: ({path, text})=>{
            routes = new Map(routes.set(path, text));
        },
        rm: (path)=>{
            routes.delete(path);
            routes = new Map(routes);
        },
    });
    onMount(async () => {
        if (routes?.size) {
            let entries = Array.from(routes.entries());
            let index = Math.max(0, entries.findIndex(([k, v])=>check_route(k)));
            let pathname = entries[index][0];
            selectedIndex = index;
            await navigate_to({pathname});
        }
    });
</script>

<ContentSwitcher bind:selectedIndex>
    {#each Array.from(routes.entries()) as [path, text]}
        <Switch {text} on:click={onclick(path)}/>
    {/each}
</ContentSwitcher>

<slot/>