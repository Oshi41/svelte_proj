<script>
    import {
        Button, MultiSelect, Search, Loading, Breadcrumb,
        BreadcrumbItem, DataTable, TooltipDefinition, OrderedList, ListItem
    } from "carbon-components-svelte";
    import {getContext, onMount, tick} from "svelte";
    import {
        get_zon_dir, subscribe_on_msg, use_ipc_fn,
        path_dirname,
    } from '../../../lib/gluon_lib.js';
    import TreeView from '../../../component/tree_view/view.svelte';
    import {
        dur2str, select_recursive,
        sequence_equal
    } from '../../../../lib/utils.js';
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
        FetchUploadCloud as Cvs_changed, AccessibilityColor,
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
    let promise;
    let map = new Map(); // original data from server
    let breadcrumbs = [], selected_folder_id, rows = [], selectedIds = []; //  table props
    let can_run_tests, can_stop_tests, can_add_to_ignore, can_rm_from_ignore; // buttons
    let selected_file_types = 'mocha selenium'.split(' '), search = '', _search = ''; // filters
    const {async_toast_err} = getContext('toast');
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
    const make_request = _dirname => {
        promise = get_zon_dir(_dirname)
            .then(data => {
                let root = data.root;
                let pairs = select_recursive([root], x => x.children).map(x => [x.fullpath, x]);
                pairs.forEach(([key, val]) => val.id = key);
                map = new Map(pairs);
                map.root = root;
                selected_folder_id = root?.fullpath;
            })
            .catch(async_toast_err(`Error during ${dirname} request`))
            .finally(() => promise = null);
    };
    $: make_request(dirname); // requesting on dirname change
    /**
     * @param tree_item {TreeFile}
     * @param search_txt {string}
     * @param _filters {string[]}
     */
    const is_filtered = (tree_item, search_txt, _filters) => {
        const {types} = tree_item;
        search_txt = search_txt?.toLowerCase();

        if (search_txt) {
            const str_props = 'filename fullpath';
            if (str_props.split(' ').map(x => tree_item[x]?.toLowerCase())
                .every(x => !x.includes(search_txt))) {
                return false;
            }
        }

        if (_filters?.length
            && _filters.every(x => !types.includes(x))) {
            return false
        }

        return true;
    };
    const perform_search = (root, search_txt, _filters) => {
        if (!root)
            return;

        let children = root.children?.map(x => perform_search(x, search_txt, _filters))
            .filter(Boolean);
        if (!children?.length && !is_filtered(root, search_txt, _filters))
            return;

        return {
            ...root,
            id: root?.fullpath,
            template: TreeItem,
            children,
        };
    };
    const render_tree = async () => {
        const main = perform_search(map.root, search, selected_file_types);
        const _map = new Map(select_recursive([main], x => x.children).map(x => [x.fullpath, x]));
        let _sel_folder = _map.get(selected_folder_id) || main;
        while (_sel_folder && !_map.has(_sel_folder.fullpath)) {
            _sel_folder = _map.get(await path_dirname(_sel_folder.fullpath));
        }
        const crumbs = [];
        let parent = _sel_folder;
        while (parent) {
            crumbs.unshift(parent);
            parent = _map.get(await path_dirname(parent.fullpath));
        }
        return {
            crumbs,
            sel_folder: _sel_folder,
            children: _sel_folder?.children || [],
        };
    };
    const handle_btn_status = () => {
        const sel_types = selectedIds.map(x => map.get(x)?.types);
        const test_types = 'selenium mocha'.split(' ');
        const only_tests = sel_types?.length
            && sel_types.every(arr => test_types.some(t => arr.includes(t)));

        can_run_tests = only_tests && sel_types.every(arr => !arr.includes('running'));
        can_stop_tests = only_tests && sel_types.every(arr => arr.includes('running'));
        can_add_to_ignore = only_tests && sel_types.every(arr => !arr.includes('ignored'));
        can_rm_from_ignore = only_tests && sel_types.every(arr => arr.includes('ignored'));
    };
    const navigate_to_child = child => {
        if (!child)
            return;
        while (child.children?.length == 1) {
            let next_child = child.children[0];
            if (!next_child.types.includes('folder'))
                break;
            child = next_child;
        }
        selected_folder_id = child.fullpath;
    };
    const manage_select = ({fullpath: id}) =>(e)=>{
        e.stopPropagation();
        const already_sel = selectedIds.includes(id);
        selectedIds = already_sel
            ? selectedIds.filter(x=>x!=id)
            : selectedIds.concat([id]);
    };
    const manage_navigation = item=>e=>{
        const {fullpath: id, types} = item;
        if (types.includes('folder'))
        {
            e.stopPropagation();
            navigate_to_child(item);
        }
    };
    $: {
        render_tree(map, search, selected_file_types, selected_folder_id).then(x => {
            const {children, crumbs, sel_folder} = x;
            const key_fn = x => x?.fullpath;

            if (selected_folder_id != key_fn(sel_folder)) {
                selected_folder_id = sel_folder.fullpath;
                selectedIds = [];
            }
            if (!sequence_equal(breadcrumbs, crumbs, key_fn))
                breadcrumbs = crumbs;
            if (!sequence_equal(children, rows, key_fn))
                rows = children;
        });
    }
    $: handle_btn_status(selectedIds);
    // onMount(() => {
    //     return subscribe_on_msg('file_change', upd_from_srv);
    // })

</script>

{#if !!promise}
    <Loading/>
{:else}
    <div style="display: flex; flex-direction: row; gap: 1px; align-items: center; align-content: center">
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
    <DataTable headers={[
        {value: 'Filename', key: 'filename', width: '90%'},
        {value: 'Type', key: 'type', width: "120px"},
    ]} rows={rows}
               sortable
               selectable
               size="short"
               bind:selectedRowIds={selectedIds}>
        <svelte:fragment slot="title">
            <Breadcrumb>
                {#each breadcrumbs as c}
                    {@const isCurrentPage = breadcrumbs.indexOf(c) == (breadcrumbs.length - 1)}
                    <BreadcrumbItem {isCurrentPage}
                                    on:click={()=>selected_folder_id = c.fullpath}
                                    key={c.fullpath}>
                        {c.filename}
                    </BreadcrumbItem>
                {/each}
            </Breadcrumb>
        </svelte:fragment>
        <svelte:fragment slot="cell" let:row let:cell>
            {@const is_changed = row.types.includes('cvs_changed')}
            {@const is_folder = row.types.includes('folder')}
            {@const is_selenium = row.types.includes('selenium')}
            {@const is_mocha = row.types.includes('mocha')}
            {@const is_ignored = row.types.includes('ignored')}
            {@const is_hidden = row.types.includes('hidden')}
            <div style="background: transparent"
                 on:dblclick={manage_navigation(row)}
                 on:click={manage_select(row)}>
                {#if cell.key == 'type'}
                    <div style="flex-direction: row; display: flex; gap: 4px">
                        {#if is_changed}
                            <TooltipDefinition tooltipText="Changed file">
                                <Cvs_changed style="fill: var(--cds-support-03)"/>
                            </TooltipDefinition>
                        {/if}
                        {#if is_folder}
                            <TooltipDefinition tooltipText="Folder">
                                <Folder/>
                            </TooltipDefinition>
                        {/if}
                        {#if is_ignored}
                            <TooltipDefinition tooltipText="Excluded from runs">
                                <Stop/>
                            </TooltipDefinition>
                        {/if}
                        {#if is_hidden}
                            <TooltipDefinition tooltipText="Hidden system path">
                                <Hidden style="fill: var(--cds-icon-02)"/>
                            </TooltipDefinition>
                        {/if}
                        {#if is_selenium}
                            <TooltipDefinition tooltipText="Contains selenium tests">
                                <Selenium style="fill: var(--cds-support-01)"/>
                            </TooltipDefinition>
                        {/if}
                        {#if is_mocha}
                            <TooltipDefinition tooltipText="Contains mocha tests">
                                <Mocha style="fill: var(--cds-link-02)"/>
                            </TooltipDefinition>
                        {/if}
                    </div>
                {:else if cell.key == 'filename'}
                    {#if is_folder}
                        <u>{cell.value}</u>
                    {:else if is_ignored}
                        <s>{cell.value}</s>
                    {:else}
                        {cell.value}
                    {/if}
                {/if}
            </div>
        </svelte:fragment>
    </DataTable>
{/if}
