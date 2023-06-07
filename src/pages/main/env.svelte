<script>
    import {NavPanel, Switch} from '../../components/nav_panel';
    import Dir from './env/dir.svelte';
    let dirs = [
        {
            dir_name: '.zon',
            text: 'System zon',
        },
        {
            dir_name: 'zon1',
        },
        {
            dir_name: 'zon2',
        },
    ];
</script>

<div style="display: flex; flex-direction: column; gap: 1em; margin: 1em">
    <h3>Working environments</h3>
    <NavPanel>
        {#each dirs as dir}
            {@const {dir_name: path, text} = dir}
            <Switch id={'env_'+path} path={'/'+path} text={text || path} component={Dir} {dir}/>
        {/each}
    </NavPanel>
</div>
