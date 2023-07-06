<script>
    import {Button, ContentSwitcher, Switch} from "carbon-components-svelte";
    import Refresh from "carbon-icons-svelte/lib/UpdateNow.svelte";
    import {getContext} from "svelte";
    import Dir from './dir.svelte';
    import {get_zon_dirs} from '../../../lib/gluon_lib.js';

    let dirs = [], promise, selected_path, selectedIndex = 0;
    const {async_toast_err} = getContext('toast');
    const handle_select = ()=>{
        let paths = dirs.map(x=>'/'+x.dirname);
        if (paths?.length && !paths.includes(selected_path))
            selected_path = paths[0];
    };
    const fetch_dirs = async () => {
        promise = get_zon_dirs().then(x=>dirs = x)
            .catch(async_toast_err('Error during environment request'))
            .finally(()=>promise = null);
    };
    $: dirs?.length && handle_select(dirs);
    promise = fetch_dirs();
</script>

<div style="display: flex; flex-direction: column; gap: 1em; padding: 1em">
    <div style="display: flex; flex-direction: row">
        <h3 style="width: 100%">Environment</h3>
        <Button icon={Refresh} skeleton={!!promise} iconDescription="Update"/>
    </div>
    <ContentSwitcher bind:selectedIndex>
        {#each dirs as {dirname}}
            <Switch text={dirname}/>
        {/each}
    </ContentSwitcher>
    <Dir dirname={dirs[selectedIndex]?.dirname}/>
</div>
