<script>
    import Tabs from '../component/route_tabs.svelte';
    import Att from '../routes/tabs/attendance.svelte';
    import Env from '../routes/tabs/env.svelte';
    import Settings from '../routes/tabs/settings.svelte';
    import layout from '../layout/main.svelte';

    /** @type {Route[]}*/
    const tabs = [
        {
            name: '/att',
            label: 'Attendance',
            component: Att,
            layout,
        },
        {
            name: '/env',
            label: 'Environment',
            component: Env,
            layout,
        },
        {
            name: '/settings',
            label: 'Settings',
            component: Settings,
            layout,
        },
    ];
</script>

<Tabs {tabs} style="padding: 1em"/>