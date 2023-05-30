<script>
    import {Route} from 'svelte-router-spa';
    import {date_format} from '../utils.js';
    import {Tab, Tabs} from 'carbon-components-svelte';

    const tabs = [
        ['/att', 'Attendance'],
        ['/settings', 'Settings'],
    ];

    export let currentRoute;
    export let params = {};
    let selected;

    const async_toast_err = ({title, timeout = 5000})=>reason=>{
        const {toast} = params;
        toast.set({
            kind: 'error',
            timeout,
            title,
            caption: date_format(new Date(), 'hh:mm:ss:zzz')+' UTC',
            subtitle: reason.message||reason.toString()
        });
    };
    $: {
        let url_tab_index = tabs.findIndex(([x,])=>x == currentRoute.name);
        if (url_tab_index>=0 && url_tab_index != selected)
            selected = url_tab_index;
    }

</script>

<div style="padding: 1em">
    <Tabs bind:selected>
        {#each tabs as [href, label]}
            <Tab {label} {href}/>
        {/each}
    </Tabs>
    <Route {currentRoute} params={{...params, async_toast_err}}/>
</div>

