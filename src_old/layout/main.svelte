<script>
    import {Route} from 'svelte-router-spa';
    import {setContext} from 'svelte';
    import {writable} from 'svelte/store';
    import {ToastNotification} from 'carbon-components-svelte';
    import {date_format} from '../utils.js';

    export let currentRoute;
    export let params;

    let toast = writable({});

    const promise_err_toast = ({title, timeout = 5000})=> reason=>{
        $toast = {
            kind: 'error',
            timeout,
            caption: date_format(new Date(), 'hh:mm:ss.zzz'),
            subtitile: reason.message || reason.toString(),
            title
        };
    };
    setContext('toast', {
        promise_err_toast
    });
</script>

<div style="padding: 1em">
    <Route {currentRoute} {params} />
</div>

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