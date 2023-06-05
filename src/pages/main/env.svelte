<script>
    import NavPanel from '../../components/nav_panel/nav_panel.svelte';
    let views = [
        {
            path: '/zon1',
            text: 'zon1',
            component: import('./env/dir.svelte'),
        },
        {
            path: '/zon2',
            text: 'zon2',
            component: import('./env/dir.svelte'),
        },
    ];
</script>

<h3>Here</h3>
