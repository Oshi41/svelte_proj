<script>
    import {NavPanel, Switch} from '../components/nav_panel';
    import {is_authorized_async} from '../lib/gluon_lib.js';
    import {getContext} from 'svelte';
    let authorized = false;
    const {async_toast_err} = getContext('toast');
    is_authorized_async().then(x=>authorized = x).catch(async_toast_err('Auth check error'));
</script>

<NavPanel>
    <Switch key="att" path="/att" text="Attendance" component={import('./main/att.svelte')} disabled={!authorized}/>
    <Switch key="env" path="/env*" text="Environment" component={import('./main/env.svelte')}/>
    <Switch key="settings" path="/settings" text="Settings" component={import('./main/settings.svelte')}/>
</NavPanel>
