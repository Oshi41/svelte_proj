<script>
    import {Button} from "carbon-components-svelte";
    import {Tab, TabPanel} from '../../component/tab_panel';

    let dirs = [];
    const create = () => {
        const path = 'zon' + (dirs.length + 1);
        dirs = [...dirs, {
            path: '/' + path,
            text: path
        }];
    };
    const ondelete = () => {
        dirs = dirs.slice(0, -1);
    };
</script>

<div style="display: flex; flex-direction: column; gap: 1em">
    <h3>Environment</h3>
    <Button on:click={create}>Add</Button>
    <Button on:click={ondelete} disabled={!dirs.length}>Remove</Button>

    <TabPanel>
        {#each dirs as {path, text}}
            <Tab {path} {text}>
                <p>{text}</p>
            </Tab>
        {/each}
    </TabPanel>
</div>
