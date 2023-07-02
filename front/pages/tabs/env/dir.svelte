<script>
    import {Button, MultiSelect, Search, Loading} from "carbon-components-svelte";
    import {getContext, onMount, tick} from "svelte";
    import {get_zon_dir, subscribe_on_msg, use_ipc_fn} from '../../../lib/gluon_lib.js';
    import TreeView from '../../../component/tree_view/view.svelte';
    import {dur2str, select_recursive, debounce} from '../../../../lib/utils.js';
    import TreeItem from './tree_item.svelte';
    import {
        Hourglass as Running,
        Wikis as Selenium,
        Cafe as Mocha,
        Folder,
        ExpandAll,
        CollapseAll,
        Run,
        Stop,
        AccessibilityColor as Hidden,
        FetchUploadCloud as Cvs_changed,
    } from "carbon-icons-svelte";

    const icon_types = {
        mocha: [Mocha, 'Mocha files'],
        selenium: [Selenium, 'Selenium files'],
        running: [Running, 'Running tests'],
        folder: [Folder, 'Only folders'],
        ignore: [Stop, 'Ignored tests'],
        hidden: [Hidden, 'Hidden file'],
        cvs_changed: [Cvs_changed, 'CVS changed file'],
    };
    export let dirname = '';
    let selectedIds = [], expandedIds = [], promise;
    let map = new Map(); // original data from server
    let tree_map = new Map(); // tree view data
    let children = [], expandAll, collapseAll; //  tree props
    let can_run_tests, can_stop_tests, can_add_to_ignore, can_rm_from_ignore; // buttons
    let selected_file_types = 'mocha selenium'.split(' '), search = '', _search = ''; // filters
    const {async_toast_err} = getContext('toast');
    const req_by_name = _dirname => {
        promise = get_zon_dir(_dirname)
            .then(data => {
                let root = data.root;
                map = new Map(select_recursive([root], x => x.children)
                    .map(x => [x.fullpath, x]));
                map.root = map.get(root.fullpath);
            })
            .catch(async_toast_err(`Error during ${dirname} request`))
            .finally(() => promise = null);
    };
    /**
     * @param source {TreeFile}
     * @return {Array | undefined}
     */
    const convert_child = (source) => {
        if (!source)
            return;

        let id = source?.fullpath;
        let _children = source?.children?.map(x => convert_child(x))?.filter(Boolean);
        if (!map.has(id) && !_children?.length)
            return;

        return {
            ...source,
            id,
            template: TreeItem,
            children: _children,
        };
    };
    const perform_search = (s, f) => {
        let pairs = Array.from(map.entries()).filter(([fullpath, tree_item]) => {
            const {types} = tree_item;
            if (s) {
                s = s.toLowerCase();
                const search_props = 'filename fullpath'.split(' ');
                if (search_props.every(prop => !tree_item[prop]?.toLowerCase()?.includes(s)))
                    return false;
            }
            for (let key of Object.keys(icon_types)) {
                const selected = !!f.includes(key);
                const filtered = !!types.includes(key);
                if (selected && filtered)
                    return true;
            }
            return false;
        });
        tree_map = new Map(pairs);
        tree_map.root = map.root;
    };
    /** @param upd {TreeFile | TreeFile[]}*/
    const upd_from_srv = upd => {
        upd = Array.isArray(upd) ? upd : [upd];
        for (let tree_item of upd) {
            const id = tree_item.fullpath;
            if (map.has(id))
                Object.assign(map.get(id), tree_item)
            else
                map.set(id, tree_item);
        }
    };
    $: req_by_name(dirname);
    $: {
        can_run_tests = can_stop_tests = can_add_to_ignore = can_rm_from_ignore = false;
        let types = selectedIds.map(x => map.get(x)?.types).filter(Boolean);
        if (types?.length > 0) {
            let test_types = 'selenium mocha'.split(' ');

            can_run_tests = types.every(arr => arr.find(x => test_types.includes(x)));
            can_stop_tests = types.every(arr => arr.includes('running'));
            can_add_to_ignore = can_run_tests && !can_stop_tests && types.every(x => !x.includes('ignore'));
            can_rm_from_ignore = !can_run_tests && types.every(x => x.includes('ignore'));
        }
    }
    $: perform_search(search, selected_file_types);
    $: {
        children = [convert_child(tree_map?.root)].filter(Boolean);
        tick().then(expandAll);
    }
    onMount(() => {
        return subscribe_on_msg('file_change', upd_from_srv);
    })
    const send_cmd = name => () => {
        let items = selectedIds.map(x => map.get(x)).filter(Boolean);
        if (items.length) {
            promise = new Promise(async (resolve, reject) => {
                try {
                    await use_ipc_fn(name)(items);
                    resolve();
                } catch (e) {
                    reject(e);
                } finally {
                    promise = null;
                }
            });
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

        <Button icon={Run} disabled={!can_run_tests} on:click={send_cmd('run_tests')}>Run tests</Button>
        <Button icon={Stop} disabled={!can_stop_tests} on:click={send_cmd('stop_tests')}>Stop tests</Button>

        <Button disabled={!can_run_tests} on:click={send_cmd('ignore_tests')}>Ignore tests</Button>
        <Button disabled={!can_stop_tests} on:click={send_cmd('rm_from_ignore')}>Delete from ignored</Button>

        <div style="padding: 1em"/>

        <div style="width: 40em">
            <Search bind:value={_search} on:change={()=>search = _search} on:clear={()=>search = _search}/>
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
