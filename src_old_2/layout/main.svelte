<script>
    import {Route} from 'svelte-router-spa';

    let toast = {};
    export let currentRoute;
    export let params;
</script>

<div  style="padding: 1em">
    <Route {currentRoute} {params}/>
</div>
