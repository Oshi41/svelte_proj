<script>
    import Tabs from '../component/route_tabs.svelte';
    import Att from '../pages/tabs/att.svelte';
    import Env from '../pages/tabs/env.svelte';

    /**
     * @type {Route[]}
     */
    const tabs = [
        {
            name: '/att',
            label: 'Attendance',
            component: Att,
        },
        {
            name: '/env',
            label: 'Environment',
            component: Env,
        },
        {
            name: '/settings',
            label: 'Settings',
        },
    ];

</script>

<Tabs {tabs}/>