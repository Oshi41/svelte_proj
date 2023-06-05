<script>
    import Route from '../route.svelte';
    import {afterUpdate, getContext, onDestroy} from 'svelte';

    let {add_or_upd, remove} = getContext('nav_panel')||{};
    if (!add_or_upd || !remove)
        throw new Error('You need to add <NavPanel /> as root component');

    add_or_upd($$props);
    onDestroy(()=>remove($$props));
    afterUpdate(()=>{
        add_or_upd($$props); // throw any updates on upper level
    });
</script>

<Route {...$$props}/>
