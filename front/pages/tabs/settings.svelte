<script>
    import {Dropdown} from 'carbon-components-svelte';
    import {getContext} from 'svelte';

    const themes = [
        ['white', 'White'],
        ['g10', 'Light gray'],
        ['g80', 'Dark gray'],
        ['g90', 'Dark'],
    ].map(([id, text]) => ({id, text}));
    const time_zones = [];
    for (let i = -12; i <= 12; i++) {
        time_zones.push({
            id: i * 60,
            text: i == 0 ? 'UTC' : `GMT${i > 0 ? '+' : '-'}${Math.abs(i)}`
        });
    }

    const app_settings = getContext('app_settings');
</script>
<div style="padding: 2em; float: left; gap: 1em; display: flex; flex-direction: column">
    <h5>Application settings</h5>
    <Dropdown titleText="Theme"
              items={themes}
              bind:selectedId={$app_settings.theme}/>

    <Dropdown titleText="Local time"
              items={time_zones}
              bind:selectedId={$app_settings.local_offset}/>
</div>