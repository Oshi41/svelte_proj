<script>
    import {Button, MultiSelect, Search, TreeView} from "carbon-components-svelte";
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
        Stop,
    } from "carbon-icons-svelte";

    const icon_types = {
        mocha: [Mocha, 'Mocha files'],
        selenium: [Selenium, 'Selenium files'],
        running: [Running, 'Running tests'],
        folder: [Folder, 'Only folders'],
        ignore: [Stop, 'Ignored tests'],
    };
    const get_icon = (types) => {
        let icons = types?.map(x => icon_types[x]).filter(Boolean);
        if (!icons?.length)
            return undefined;
        if (icons.length == 1)
            return icons[0][0];
        return null;
    }

    export let dirname = '';
    let selectedIds = [], expandedIds = [], promise, data, children, expandAll, collapseAll, map;
    let can_run_tests, can_stop_tests, can_add_to_ignore, can_rm_from_ignore;
    let selected_file_types = Object.keys(icon_types), search = '';
    const {async_toast_err} = getContext('toast');
    const req_by_name = _dirname => {
        promise = get_zon_dir(_dirname)
            .then(x => data = x)
            .catch(async_toast_err(`Error during ${dirname} request`))
            .finally(() => promise = null);
    };
    const convert_child = (source) => {
        if (!source)
            return;

        let id = source?.fullpath;
        let children = source?.children?.map(x=>convert_child(x));
        if (!map.has(id) && !children?.length || children.every(({fullpath})=>!map.has(fullpath)))
            return;

        const {filename: text, types} = source;
        return {
            id, text, icon: get_icon(types),
            children
        };
    };
    $: req_by_name(dirname);
    $: {
        const search_props = 'fullname fullpath'.split(' ');
        let all_items = select_recursive([data?.root], x => x?.children);
        if (search)
            all_items = all_items.filter(i=>search_props.find(p=>p[i].toLowerCase().includes(search.toLowerCase())));
        if (selected_file_types?.length)
            all_items = all_items.filter(({types})=>types.find(x=>selected_file_types.includes(x)));
        map = new Map(all_items.map(x=>[x.fullpath, x]));
        children = convert_child([data?.root]);
        expandAll?.();
    }
    $: {
        can_run_tests = can_stop_tests = can_add_to_ignore = can_rm_from_ignore = false;
        let types = selectedIds.map(x => map.get(x)?.types).filter(Boolean);
        if (types?.length > 0) {
            let test_types = 'selenium mocha'.split(' ');

            can_run_tests = types.every(arr => arr.find(x => test_types.includes(x)));
            can_stop_tests = types.every(arr => arr.includes('running'));
            can_add_to_ignore = can_run_tests && !can_stop_tests;
            can_rm_from_ignore = !can_run_tests && types.every(x => x.includes('ignore'));
        }
    }
</script>

{#if !!promise}
    <Loading/>
{:else}
    <div style="display: flex; flex-direction: row; gap: 1px; align-items: center; align-content: center">
        <Button icon={ExpandAll} iconDescription="Expand all" on:click={expandAll}/>
        <Button icon={CollapseAll} iconDescription="Collapse all" on:click={collapseAll}/>

        <div style="padding: 1em"/>

        <Button icon={Run} disabled={!can_run_tests}>Run tests</Button>
        <Button icon={Stop} disabled={!can_stop_tests}>Stop tests</Button>

        <Button disabled={!can_run_tests}>Ignore tests</Button>
        <Button disabled={!can_stop_tests}>Delete from ignored</Button>

        <div style="padding: 1em"/>

        <div style="width: 40em">
            <Search bind:value={search}
            />
        </div>
        <div style="width: 40em; margin-bottom: 24px">
            <MultiSelect size="xl"
                         bind:selectedIds={selected_file_types}
                         titleText="File type"
                         items={Array.from(Object.entries(icon_types)).map(([id, [, text]])=>({id, text}))}
            />
        </div>

        <div style="width: 100%"/>
    </div>
    <TreeView bind:selectedIds bind:expandedIds labelText={dirname + ' files'} {children}
              bind:expandAll bind:collapseAll/>
{/if}
