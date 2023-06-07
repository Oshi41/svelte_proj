<script>
    import Route from '../route.svelte';
    import {afterUpdate, getContext, onDestroy} from 'svelte';

    let {add_or_upd, remove} = getContext('nav_panel')||{};
    if (!add_or_upd || !remove)
        throw new Error('You need to add <NavPanel /> as root component');

    add_or_upd($$props);
    afterUpdate(()=>{
        add_or_upd($$props); // pass any updates on upper level
    });
    onDestroy(()=>remove($$props));

    console.log('Route props:', $$props);
</script>

<Route {...$$props}/>
