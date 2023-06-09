<script>
    import {TabPanel, Tab} from '../../component/tab_panel';
    import Attendance from './att.svelte';
    import Environment from './env.svelte';
    // import {ContentSwitcher, Switch} from "carbon-components-svelte";
    // import Route, {get_route_ctx} from '../../component/route.svelte';
    //
    // let {navigate_to} = get_route_ctx();
    // const onclick = path=>async () => {
    //     await navigate_to(path);
    // };
</script>

<TabPanel>
    <Tab path="/att" text="Attendance">
        <Attendance/>
    </Tab>
    <Tab path="/env" text="Environment">
        <Environment/>
    </Tab>
</TabPanel>


<!--<ContentSwitcher>-->
<!--    <Switch text='Attendance' on:click={onclick('/att')}/>-->
<!--    <Switch text='Environment' on:click={onclick('/env')}/>-->
<!--</ContentSwitcher>-->
<!--<Route path="/att">-->
<!--    <Attendance/>-->
<!--</Route>-->
<!--<Route path="/env">-->
<!--    <Environment/>-->
<!--</Route>-->
