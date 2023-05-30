<script>
    import 'carbon-components-svelte/css/all.css';
    import {Tabs, Tab, TabContent, Theme, ToastNotification} from 'carbon-components-svelte';
    import Attendance from './lib/Attendance.tab.svelte';
    import {last_toast_store} from './lib/ctx.js';
    import {createEventDispatcher} from 'svelte'

    let theme = 'g10';
    let toasts = [];
    $: {
        if (Object.keys($last_toast_store).length)
            toasts = [$last_toast_store];
    }

</script>

<Theme bind:theme/>

<div style="padding: 1em">
    <Tabs>
        <Tab label="Attendance"/>
        <svelte:fragment slot="content">
            <TabContent>
                <Attendance/>
            </TabContent>
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