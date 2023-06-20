<script>
    import 'carbon-components-svelte/css/all.css';
    import {Theme, ToastNotification} from 'carbon-components-svelte';
    import {setContext} from 'svelte';
    import {writable} from 'svelte/store';
    import {date_format} from '../lib/utils.js';
    import {lc_json_writable_store} from './lib/svelte_utils.js';
    import Route from './component/route.svelte';
    import Auth from './pages/auth.svelte';
    import Tabs from './pages/tabs/index.svelte';

    const toast = writable({});
    setContext('toast', {
        async_toast_err: (title, timeout = 5000)=>reason=>{
            $toast = {
                kind: 'error',
                timeout,
                title,
                subtitle: reason?.message||reason.toString(),
            }
        },
        make_err: (title, subtitle, timeout = 5000)=>{
            $toast = {
                kind: 'error',
                timeout,
                title,
                subtitle,
            }
        },
    });
    let app_settings = lc_json_writable_store('app_settings', {
        theme: 'g80',
    }, 'all');
</script>
<Theme bind:theme={$app_settings.theme}/>

<Route path="/auth" disabled={true}>
    <Auth/>
</Route>

<Route path="/" disabled={false}>
    <Tabs/>
</Route>

{#key $toast}
    {#if (!!Object.keys($toast).length)}
        {@const {
            kind, lowContrast, timeout, title, subtitle,
            hideCloseButton, fullWidth
        } = $toast}
        {@const caption = date_format(new Date(), 'HH:mm:ss.zzz')+' UTC'}
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

