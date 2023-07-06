<script>
    import {Tooltip} from "carbon-components-svelte";
    export let dirname;
    let running_tests = [];
</script>

<Tooltip triggerText={'Running tests: '+running_tests.length}>
    <div style="display: flex; flex-direction: column; gap: 1em; max-width: 250px; max-height: 400px">
        {#each running_tests as test}
            <div>
            </div>
        {/each}
    </div>
</Tooltip>