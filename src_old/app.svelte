<script>
    import 'carbon-components-svelte/css/all.css';
    import {Theme, ToastNotification} from 'carbon-components-svelte';
    import {Router} from 'svelte-router-spa';
    import Auth from './routes/auth.svelte';
    import Tabs from './routes/tabs.svelte';
    import {writable} from 'svelte/store';
    import MainLayout from './layout/main.svelte';
    import {use_reactive_ctx} from './lib/store.js';
    import {setContext} from 'svelte';
    import {is_authorized} from './gluon_utils.js';

    let app_settings = use_reactive_ctx('app_settings', {
        theme: 'g10',
    }, 'all');
    let toast = setContext('toast', writable({}));
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
            name: '/auth',
            component: Auth
        },
        {
            name: '/:tab',
            component: Tabs,
            ...auth_redirect,
        },
    ];
</script>

<Theme bind:theme={$app_settings.theme}/>
<div style="display: flex; flex-direction: column">
    <Router {routes}/>
    ;
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
</div>

