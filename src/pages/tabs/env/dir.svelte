<script>
    import {Button, TreeView} from "carbon-components-svelte";
    import {get_zon_dir} from '../../../lib/gluon_lib.js';
    import {select_recursive} from '../../../utils.js';
    import {getContext} from "svelte";
    import {Loading} from "carbon-components-svelte";
    import {
        Hourglass as Running,
        Wikis as Selenium,
        Cafe as Mocha,
        Folder,
        ExpandAll,
        CollapseAll,
        Run,
        FolderMoveTo,
        FolderDetails,
    } from "carbon-icons-svelte";

    const icon_types = {
        mocha: Mocha,
        selenium: Selenium,
        running: Running,
        folder: Folder,
        folder_with_tests: FolderMoveTo,
        folder_with_running_tests: FolderDetails,
    };
    const type_icon_map = new Map(Array.from(Object.entries(icon_types)));
    const test_types = 'mocha selenium folder_with_tests'.split(' ');
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

        const {fullpath, filename, type} = source;
        return {
            id: fullpath,
            text: filename,
            icon: type_icon_map.get(type),
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
    </div>
    <TreeView bind:selectedIds bind:expandedIds labelText={dirname + ' files'} {children}
        bind:expandAll bind:collapseAll/>
{/if}
