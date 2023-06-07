<script>
    import {afterUpdate, getAllContexts, getContext, onDestroy} from 'svelte';
    import Route, {get_full_path} from '../route.svelte';

    let {add_or_upd, remove} = getContext('nav_panel')||{};
    if (!add_or_upd|| !remove)
        throw new Error('You need to add <NavPanel /> as root component');

    add_or_upd($$props);
    afterUpdate(()=>{
        add_or_upd($$props); // pass any updates on upper level
    });
    onDestroy(()=>remove($$props));
    const ctx = getAllContexts();
    let base_path = get_full_path(ctx, $$props.path);
    const {selected_path} = ctx.get('nav_panel');
    let component, visible;
    const update_component = comp=>{
        if (!comp)
            component = null;
        else if (comp?.prototype)
            component = comp; // Svelte component
        else
            comp.then(x=>component = x.default); // Promise or import()
    };
    update_component($$props.component);
    const {path} = $$props;
    $: visible = $selected_path==$$props.path;
</script>

<Route {...$$props} />
