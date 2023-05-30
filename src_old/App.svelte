<script>
    import 'carbon-components-svelte/css/all.css';
    import {Theme} from 'carbon-components-svelte';
    import Attendance from './lib/Attendance.tab.svelte';
    import MainLayout from './layout/main.svelte';
    import {Router} from 'svelte-router-spa';
    let theme = 'g10';
    const routes = [
        {
            name: '/att',
            component: Attendance,
            layout: MainLayout,
        }
    ]
</script>

<Theme bind:theme/>

<Router {routes} options={{theme}}/>