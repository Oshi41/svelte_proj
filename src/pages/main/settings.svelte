<script>
    import {Select, SelectItem} from 'carbon-components-svelte';
    import {getContext} from 'svelte';
    const themes = new Map([
        ['white', 'White'],
        ['g10', 'Light gray'],
        ['g80', 'Dark gray'],
        ['g90', 'Dark'],
    ]);
    const app_settings = getContext('app_settings');
</script>
<div style="padding: 2em; float: left; gap: 1em; display: flex; flex-direction: column">
    <h5>Application settings</h5>
    <Select labelText="Theme" bind:selected={$app_settings.theme}>
        {#each Array.from(themes.entries()) as [value, text]}
            <SelectItem {value} {text}/>
        {/each}
    </Select>
</div>