<script>
    import {TabPanel, Tab} from '../../component/tab_panel';
    import Attendance from './att.svelte';
    import Environment from './env/index.svelte';
    import Settings from './settings.svelte';
</script>

<TabPanel>
    <Tab path="/att" text="Attendance">
        <Attendance/>
    </Tab>
    <Tab path={'/env'} text="Environment">
        <Environment/>
    </Tab>
    <Tab path="/settings" text="Settings">
        <Settings/>
    </Tab>
</TabPanel>
