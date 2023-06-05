<script>
    import {ContentSwitcher, Switch} from 'carbon-components-svelte';
    import Route, {Router, get_full_path} from '../route.svelte';
    import {navigateTo, router} from 'yrv';
    import {getAllContexts, onMount, setContext} from 'svelte';

    let selectedIndex;
    const ctx = getAllContexts();
    let views = [];
    setContext('nav_panel', {
        add: x=>views = [...views, x],
        remove: x=>views = views.filter(v=>x.id!=v.id)
    });
    $: {
        let view = views[selectedIndex];
        if (view?.path){
            let current_path = get_full_path(ctx, view.path);
            navigateTo(current_path);
        }
    }
    let switcher;
    onMount(()=>{
        let current_path = window.location.href;
        let index = views.findIndex(x=>current_path.includes(get_full_path(ctx, x.path)));
        if (index>=0)
            selectedIndex = index;
    });
</script>

<Router>
    <ContentSwitcher bind:selectedIndex>
        {#each views as view}
            {@const index = views.indexOf(view)}
            <Switch text={view.text} selected={index == selectedIndex}/>
        {/each}
    </ContentSwitcher>

    <slot/>

    <!--{#each views as {path, component}}-->
<!--        <Route {path} {component}/>-->
<!--    {/each}-->
</Router>

