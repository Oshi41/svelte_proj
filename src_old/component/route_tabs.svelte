<script>
    import {Tab, TabContent, Tabs, TabsSkeleton} from 'carbon-components-svelte';
    import {onMount} from 'svelte';
    import {navigateTo, Router, routeIsActive} from 'svelte-router-spa';

    export let tabs = [];
    export let skeleton = false;
    export let currentRoute;
    export let params = {};
    let selected = 0;
    onMount(()=>{
        let from_url = tabs?.find(x=>routeIsActive(x.name));
        if (from_url)
        {
            navigateTo(from_url.name);
            selected = tabs.indexOf(from_url);
        }
    });
</script>

{#if (skeleton)}
    <TabsSkeleton/>
{:else if (tabs?.length>0)}
    <Tabs bind:selected {...$$restProps}>
        {#each tabs as {label, name}}
            <Tab {label} href={name}/>
        {/each}
        <svelte:fragment slot="content">
            {#each tabs as {component, layout}}
                <TabContent>
                    <svelte:component this={component} />
                </TabContent>
            {/each}
        </svelte:fragment>
    </Tabs>
{/if}
