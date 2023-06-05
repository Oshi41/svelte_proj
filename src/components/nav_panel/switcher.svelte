<script>
    import Route from '../route.svelte';
    import {getContext, onDestroy} from 'svelte';

    let {add, remove} = getContext('nav_panel')||{};
    if (!add || !remove)
        throw new Error('You need to add <NavPanel /> as root component');

    add($$props);
    onDestroy(()=>remove($$props));
</script>

<Route {...$$props}/>
