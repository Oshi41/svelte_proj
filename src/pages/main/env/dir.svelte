<script>
    import {TreeView} from 'carbon-components-svelte';

    export let dir;
    const {dir_name, text} = dir||{};
    let label;
    $: label = text || dir_name;
</script>

<h3>Here</h3>
<TreeView />