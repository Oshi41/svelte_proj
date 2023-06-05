<script>
    import {NavPanel, Switch} from '../components/nav_panel';
</script>

<NavPanel>
    <Switch path="/att" text="Attendance" component={import('./main/att.svelte')}/>
    <Switch path="/env" text="Environment" component={import('./main/env.svelte')}/>
    <Switch path="/settings" text="Settings" component={import('./main/settings.svelte')}/>
</NavPanel>
