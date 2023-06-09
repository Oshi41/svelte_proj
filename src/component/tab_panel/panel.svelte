<script context="module">
    export const ctx_name = '_tab_panel';
</script>

<script>
    import {ContentSwitcher, Switch} from "carbon-components-svelte";
    import {get_route_ctx, check_route} from '../route.svelte';
    import {onMount, setContext} from "svelte";

    export let selected_path;
    let routes = new Map(), selectedIndex;
    const {navigate_to} = get_route_ctx();
    const set_select = (find) => {
        const entries = Array.from(routes.entries());
        if (Number.isFinite(+find)) // set from selected index
            selected_path = entries[+find]?.[0];
        else if (typeof find == 'string' && routes.has(find))
            selectedIndex = entries.findIndex(([x]) => x == find);
        else
            console.warn("Unknown route:", find);
    };
    setContext(ctx_name, {
        add: ({path, text}) => {
            routes = new Map(routes.set(path, text));
        },
        rm: (path) => {
            routes.delete(path);
            routes = new Map(routes);
        },
    });
    $: set_select(selected_path);
    $: set_select(selectedIndex);
    $: routes.has(selected_path) && navigate_to({pathname: selected_path});

    onMount(async () => {
        if (routes?.size) {
            selected_path = Array.from(routes.keys()).find(x => check_route(x));
        }
    });
</script>

<ContentSwitcher bind:selectedIndex>
    {#each Array.from(routes.entries()) as [path, text]}
        <Switch {text} selected={selected_path == path}/>
    {/each}
</ContentSwitcher>

<slot/>