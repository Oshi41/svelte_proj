<!--<script>-->
<!--    import 'carbon-components-svelte/css/all.css';-->
<!--    import {Theme} from 'carbon-components-svelte';-->
<!--    // import Router from './component/router.svelte';-->
<!--    // import layout from './layout/main.svelte';-->
<!--    import TabsView from './pages/tabs.svelte';-->

<!--    let theme = 'g100';-->
<!--    /** @type {Route[]}*/-->
<!--    let routes = [-->
<!--        {-->
<!--            name: '/auth',-->
<!--            layout,-->
<!--        },-->
<!--        {-->
<!--            name: '/:tab',-->
<!--            component: TabsView,-->
<!--            layout,-->
<!--        },-->
<!--        {-->
<!--            name: '/',-->
<!--            redirectTo: '/att'-->
<!--        }-->
<!--    ];-->
<!--</script>-->
<!--<Theme bind:theme />-->
<!--&lt;!&ndash;<Router {routes}/>&ndash;&gt;-->

<script>

    import {Theme} from 'carbon-components-svelte';
    import {Route, Router} from 'svelte-navigator';
    import Auth from './pages/auth.svelte';
    import Tabs from './pages/tabs.svelte';


    let theme = 'g10';
</script>

<Theme bind:theme />

<Router>
    <Route path="/auth" component={Auth} />
    <Route path="/" component={Tabs} />
</Router>
