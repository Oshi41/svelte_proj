<script>
    import {Tab, TabContent, Tabs, TabsSkeleton} from 'carbon-components-svelte';
    import {navigateTo, routeIsActive} from 'svelte-router-spa';
    import {onMount} from 'svelte';
    import Router from '../component/router.svelte';

    export let tabs = [];
    export let skeleton = false;
    export let currentRoute;
    export let params = {};
    let selected = 0, orig_route = '';
    const navigate = path=>navigateTo(orig_route+path);
    onMount(()=>{
        if (tabs?.length){
            let from_url = tabs.findIndex(x=>routeIsActive(x.name, true));
            if (from_url>=0 && from_url!=selected){
                selected = from_url;
                navigate(tabs[from_url].name);
            }
        }
    });
</script>

{#if (skeleton)}
    <TabsSkeleton/>
{:else if (tabs?.length>0)}
    <Tabs bind:selected {...$$restProps}>
        {#each tabs as {label, name}}
            <Tab {label} href={orig_route+name}/>
        {/each}
        <Router routes={tabs} />
    </Tabs>
{/if}
