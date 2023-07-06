<script>
    import {ContentSwitcher, Switch} from 'carbon-components-svelte';
    import Attendance from './att.svelte';
    import Environment from './zdir/index.svelte';
    import Settings from './settings.svelte';

    let selectedIndex = 0;
    const tabs = [Attendance, Environment, Settings];

</script>

<ContentSwitcher bind:selectedIndex>
    <Switch text="Attendance"/>
    <Switch text="Environment"/>
    <Switch text="Settings"/>
</ContentSwitcher>

<svelte:component this={tabs[selectedIndex]}/>