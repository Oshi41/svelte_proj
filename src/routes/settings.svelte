<script>
    import {Select, SelectItem} from 'carbon-components-svelte';
    const themes = new Map([
        ['white', 'White'],
        ['g10', 'Light gray'],
        ['g80', 'Dark gray'],
        ['g90', 'Dark'],
    ]);
    export let params;
    const {app_settings} = params;
</script>
<div style="padding: 2em; float: left; gap: 1em; display: flex; flex-direction: column">
    <h5>Application settings</h5>
    <Select labelText="Theme">
        {#each Array.from(themes.entries()) as [value, text]}
            <SelectItem {value} {text}/>
        {/each}
    </Select>
</div>