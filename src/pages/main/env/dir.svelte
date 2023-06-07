<script>
    import {TreeView} from 'carbon-components-svelte';

    export let dir = {};
    const {dir_name} = dir;
</script>

<h3>{dir_name}</h3>
<TreeView />