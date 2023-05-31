<script>
    import 'carbon-components-svelte/css/all.css';
    import {Theme, ToastNotification} from 'carbon-components-svelte';
    import {Router} from 'svelte-router-spa';
    import Attendance from './routes/attendance.svelte';
    import Settings from './routes/settings.svelte';
    import Auth from './routes/auth.svelte';
    import {writable} from 'svelte/store';
    import MainLayout from './layout/main.svelte';
    import {use_reactive_ctx} from './lib/store.js';
    import {setContext} from 'svelte';
    import {is_authorized} from './gluon_utils.js';

    let app_settings = use_reactive_ctx('app_settings', {
        theme: 'g10'
    }, 'theme'.split(' '));
    let toast = writable({});
    setContext('toast', toast);
    const layout = MainLayout;
    const auth_redirect = {
        onlyIf: {
            guard: is_authorized,
            redirect: '/auth',
        }
    }

    /** @type {Route[]}*/
    const routes = [
        {
            name: 'auth',
            component: Auth
        },
        {
            name: 'att',
            component: Attendance,
            layout,
            ...auth_redirect,
        },
        {
            name: 'settings',
            component: Settings,
            layout,
            ...auth_redirect,
        },
        {
            name: '/',
            redirectTo: 'att',
            ...auth_redirect,
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
