<script>
    import {ContentSwitcher, Switch} from 'carbon-components-svelte';
    import {Router, get_full_path} from '../route.svelte';
    import {navigateTo} from 'yrv';
    import {getAllContexts, onMount, setContext} from 'svelte';
    import {writable} from 'svelte/store';

    let selectedIndex;
    const ctx = getAllContexts();
    let views = [];
    const {selected_path} = setContext('nav_panel', {
        add_or_upd: x=>{
            let index = views.findIndex(v=>x.id==v.id);
            if (index>=0)
                views.splice(index, 1, x);
            else
                views.push(x);
            views = [...views];
        },
        remove: x=>views = views.filter(v=>x.id!=v.id),
        selected_path: writable(),
    });
    $: {
        let view = views[selectedIndex];
        $selected_path = view?.path;
        if (view?.path){
            let current_path = get_full_path(ctx, view.path);
            navigateTo(current_path);
        }
    }
    let base_path = get_full_path(ctx);
    console.log(base_path);
    onMount(()=>{
        let current_path = window.location.href;
        let index = views.findIndex(x=>current_path.includes(get_full_path(ctx, x.path)));
        if (index>=0)
            selectedIndex = index;
    });
</script>

<Router path={base_path}>
    <ContentSwitcher bind:selectedIndex>
        {#each views as view}
            {@const selected = selectedIndex==views.indexOf(view)}
            {@const {disabled, text} = view}
            <Switch {selected} {text} {disabled}/>
        {/each}
    </ContentSwitcher>
    <slot/>
</Router>

