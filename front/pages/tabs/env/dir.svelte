<script>
    import {
        Button,
        MultiSelect,
        Search,
        Loading,
        Breadcrumb,
        BreadcrumbItem,
        DataTable, TooltipDefinition,
    } from "carbon-components-svelte";
    import {getContext} from "svelte";
    import {Run, Stop} from "carbon-icons-svelte";
    import {get_zon_dir, use_ipc_fn, path_dirname,} from '../../../lib/gluon_lib.js';
    import {runtime_set_style} from '../../../lib/svelte_utils.js';
    import {select_recursive, debounce, sequence_equal} from '../../../../lib/utils.js';
    import TypesCell from './types_cell.svelte';
    import FilenameCell from './filename_cell.svelte';
    import TestStatCell from './test_stat_cell.svelte';

    const icon_types = {
        mocha: 'Mocha files',
        selenium: 'Selenium files',
        running: 'Running tests',
        folder: 'Only folders',
        ignore: 'Ignored tests',
        hidden: 'Hidden file',
        cvs_changed: 'CVS changed file',
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
    /**
     * @param left {string[]}
     * @param right {string[]}
     */
    const types_sort_fn = (left, right) => {
        for (let key of 'folder cvs_changed selenium mocha hidden ignored'.split(' ')) {
            const [l, r] = [left, right].map(x => x.includes(key));
            if (l != r)
                return +l - +r;
        }
        return 0;
    }
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
    // fix to change table-layout property
    // https://github.com/carbon-design-system/carbon-components-svelte/blob/master/src/DataTable/DataTable.svelte#L283
    const action = runtime_set_style('table', {tableLayout: 'unset'});
    const select_on_click = debounce(({fullpath: id} = {}) => {
        const already_sel = selectedIds.includes(id);
        selectedIds = already_sel
            ? selectedIds.filter(x => x != id)
            : selectedIds.concat([id]);
    }, {timeout: 140});
    const navigate_on_dbl_click = (e, row) => {
        if (row.types.includes('folder')) {
            e.stopPropagation();
            select_on_click.cancel();
            navigate_to_child(row);
        }
    }
</script>

{#if !!promise}
    <Loading/>
{:else}
    <div style="display: flex; flex-direction: row; gap: 1px; align-items: center; align-content: center"
         use:action>
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
                         items={Array.from(Object.entries(icon_types)).map(([id, text])=>({id, text}))}
            />
        </div>

        <div style="width: 100%"/>
    </div>
    <DataTable headers={[
               {value: 'Type', key: 'types', width: '120px', sort: types_sort_fn},
               {value: 'File name', key: 'filename'},
               {value: 'Test stats', key: 'teststats'},
               ]}
               rows={rows}
               sortable
               selectable
               size="short"
               bind:selectedRowIds={selectedIds}>
        <svelte:fragment slot="title">
            <div style="display: flex; flex-direction: column; align-items: flex-start">
                <Breadcrumb>
                    {#each breadcrumbs as c, i}
                        {@const isCurrentPage = i == (breadcrumbs.length - 1)}
                        <BreadcrumbItem {isCurrentPage}>
                            <Button kind="ghost" size="small"
                                    on:click={()=>selected_folder_id = c.fullpath}>
                                {c.filename}
                            </Button>
                        </BreadcrumbItem>
                    {/each}
                </Breadcrumb>
                <TooltipDefinition>
                    <svelte:fragment slot="tooltip">
                        <ul>
                            {#each selectedIds as name}
                                {@const row = map.get(name)}
                                <!-- save pkg for file reference -->
                                {@const rel_path = row?.fullpath?.substring(map?.root?.fullpath?.length - 3)}
                                <li style="display: flex; flex-direction: row; gap: 1em">
                                    <TypesCell cell={{key: 'types'}} {row}/>
                                    {rel_path}
                                </li>
                            {/each}
                        </ul>
                    </svelte:fragment>
                    <p>Currently selected:</p>
                </TooltipDefinition>
            </div>
        </svelte:fragment>
        <svelte:fragment slot="cell" let:row let:cell>
            <div style="background: transparent;"
                 on:click={()=>select_on_click(row)}
                 on:dblclick={e=>navigate_on_dbl_click(e, row)}>

                <TypesCell {row} {cell}/>
                <FilenameCell {row} {cell} on_folder_click={e=>navigate_on_dbl_click(e, row)}/>
                <TestStatCell {row} {cell}/>
            </div>
        </svelte:fragment>
    </DataTable>
{/if}
