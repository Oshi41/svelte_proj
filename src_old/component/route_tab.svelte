<script>
    import {Route} from 'svelte-router-spa';
    export let currentRoute;
    export let params;
</script>

<Route {currentRoute} {params}/>