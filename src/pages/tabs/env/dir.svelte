<script>
    import {Button, TreeView} from "carbon-components-svelte";
    import {get_zon_dir} from '../../../lib/gluon_lib.js';
    import {select_recursive} from '../../../utils.js';
    import {getContext} from "svelte";
    import {Loading} from "carbon-components-svelte";
    import TreeItem from './tree_item.svelte';
    import {
        Hourglass as Running,
        Wikis as Selenium,
        Cafe as Mocha,
        Folder,
        ExpandAll,
        CollapseAll,
        Run,
        Stop
    } from "carbon-icons-svelte";

    const icon_types = {
        mocha: Mocha,
        selenium: Selenium,
        running: Running,
        folder: Folder,
        test: Run,
        ignore: Stop,
    };
    const get_icon = (type)=>{
        type = Array.isArray(type) ? type : type?.split(' ')||[];
        let icons = type.map(x=>icon_types[x]).filter(Boolean);
        if (!icons?.length)
            return undefined;
        if (icons.length == 1)
            return icons[0];
        return null;
        // return <div>{type}</div>;
    }
    const test_types = 'mocha selenium tests'.split(' ');
    const run_tests = 'running folder_with_running_tests'.split(' ');

    export let dirname = '';
    let selectedIds = [], expandedIds = [], promise, data, children, expandAll, collapseAll, map;
    let can_run_tests = false, can_stop_tests = false;
    const {async_toast_err} = getContext('toast');
    const req_by_name = _dirname => {
        promise = get_zon_dir(_dirname)
            .then(x => data = x)
            .catch(async_toast_err(`Error during ${dirname} request`))
            .finally(() => promise = null);
    };
    const convert_children = (source)=>{
        if (!source)
            return source;

        const {fullpath, filename, types} = source;
        return {
            id: fullpath,
            text: filename,
            icon: TreeItem,
            children: source?.children?.map(x=>convert_children(x)),
        };
    };
    $: req_by_name(dirname);
    $: {
        children = [convert_children(data?.root)].filter(Boolean);
        map = new Map(select_recursive([data?.root], x=>x?.children).map(x=>[x.fullpath, x]));
        expandAll?.();
    }
    $: {
        let types = selectedIds.map(x=>map.get(x)?.type);
        can_run_tests = types.every(x=>test_types.includes(x));
        can_stop_tests = types.every(x=>run_tests.includes(x));
    }
</script>

{#if !!promise}
    <Loading/>
{:else}
    <div style="display: flex; flex-direction: row; gap: 1px">
        <Button icon={ExpandAll} iconDescription="Expand all" on:click={expandAll}/>
        <Button icon={CollapseAll} iconDescription="Collapse all" on:click={collapseAll}/>

        <div style="padding: 1em" />

        <Button icon={Run} disabled={!can_run_tests}>Run tests</Button>
        <Button icon={Run} disabled={!can_stop_tests}>Stop tests</Button>

        <Button icon={Run} disabled={!can_run_tests}>Ignore tests</Button>
        <Button icon={Run} disabled={!can_stop_tests}>Delete from tests</Button>
    </div>
    <TreeView bind:selectedIds bind:expandedIds labelText={dirname + ' files'} {children}
        bind:expandAll bind:collapseAll>
        <svelte:fragment slot="tree_item">
            <p>Here</p>
        </svelte:fragment>
    </TreeView>
{/if}
