<script>
    import 'carbon-components-svelte/css/all.css';
    import {Theme, ToastNotification} from 'carbon-components-svelte';
    import {Router} from 'svelte-router-spa';
    import Attendance from './routes/attendance.svelte';
    import Settings from './routes/settings.svelte';
    import {writable} from 'svelte/store';
    import MainLayout from './layout/main.svelte';
    import {use_reactive} from './lib/store.js';

    let app_settings = use_reactive('app_settings', {
        theme: 'g10'
    }, 'theme'.split(' '));
    let toast = writable({});
    const params = {app_settings, toast};
    const layout = MainLayout;
    /** @type {Route[]}*/
    const routes = [
        {
            name: '/',
            redirectTo: '/att'
        },
        {
            name: '/att',
            component: Attendance,
            layout,
        },
        {
            name: '/settings',
            component: Settings,
            layout,
        },
    ];
</script>
<Theme bind:theme={$app_settings.theme}/>

<Router {routes} params={{app_settings, toast}}/>

{#key $toast}
    {#if (!!Object.keys($toast).length)}
        {@const {
            kind, lowContrast, timeout, title, subtitle, caption,
            hideCloseButton, fullWidth
        } = $toast}
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
