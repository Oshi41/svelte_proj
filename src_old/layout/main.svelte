<script>
    import {Tabs, Tab, ToastNotification} from 'carbon-components-svelte';
    import {Route, navigateTo, routeIsActive} from 'svelte-router-spa';
    import {last_toast_store} from '../lib/ctx.js';

    const tabs = [
        {label: 'Attendance', ref: '/att'},
        {label: 'Settings', ref: '/settings'},
    ];
    let selected = 0;
    export let currentRoute;
    export let params = {};
    $: {
        let cur_path = tabs[selected].ref;
        if (!routeIsActive(cur_path))
            navigateTo(cur_path, 'en', true);
    }
</script>

<main>
    <div style="padding: 1em">
        <Tabs bind:selected>
            {#each tabs as {label}}
                <Tab label={label}/>
            {/each}
            <svelte:fragment slot="content">
                <Route {currentRoute} {params}/>
            </svelte:fragment>
        </Tabs>
        {#key $last_toast_store}
            {#if (!!Object.keys($last_toast_store).length)}
                {@const {
                    kind, lowContrast, timeout, title, subtitle, caption,
                    hideCloseButton, fullWidth
                } = $last_toast_store}
                <ToastNotification kind={kind}
                                   lowContrast={lowContrast}
                                   timeout={timeout}
                                   title={title}
                                   subtitle={subtitle}
                                   caption={caption}
                                   hideCloseButton={hideCloseButton}
                                   fullWidth={fullWidth}

                />
            {/if}
        {/key}
    </div>
</main>
