<script>
    import {
        Button,
        Search,
        Loading,
        Breadcrumb,
        BreadcrumbItem,
        DataTable,

    } from "carbon-components-svelte";
    import {getContext} from "svelte";
    import {
        Cafe as Mocha, Wikis as Selenium,
        FetchUploadCloud as Cvs_changed
    } from "carbon-icons-svelte";
    import {get_zon_dir, path_dirname, send_msg} from '../../../lib/gluon_lib.js';
    import {select_recursive, sequence_equal} from '../../../../lib/utils.js';
    import TypesCell from './cells/types_cell.svelte';
    import FilenameCell from './cells/filename_cell.svelte';
    import TestStatCell from './cells/test_stat_cell.svelte';
    import ActionsCell from './cells/actions_cell.svelte';
    import RunningTests from './running_tests.svelte';

    const filters = {
        mocha: [Mocha, 'Show mocha files'],
        selenium: [Selenium, 'Show selenium files'],
        cvs_changed: [Cvs_changed, 'Show changed files'],
    };
    export let dirname = '';
    let promise;
    let map = new Map(); // original data from server
    let breadcrumbs = [], selected_folder_id, rows = []; //  table props
    let selected_file_types = 'mocha selenium'.split(' '), search = '', _search = ''; // filters
    const {async_toast_err} = getContext('toast');
    const use_loader = (_promise, label)=>{
        promise = _promise
            .catch(async_toast_err(label))
            .finally(()=>promise = null);
    }
    const make_request = _dirname => {
        use_loader(get_zon_dir(dirname).then(data=>{
            let root = data.root;
            let pairs = select_recursive([root], x => x.children).map(x => [x.fullpath, x]);
            pairs.forEach(([key, val]) => val.id = key);
            map = new Map(pairs);
            map.root = root;
            selected_folder_id = root?.fullpath;
        }), `Error during ${dirname} request`);
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
            const str_props = 'filename';
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
            }
            if (!sequence_equal(breadcrumbs, crumbs, key_fn))
                breadcrumbs = crumbs;
            if (!sequence_equal(children, rows, key_fn))
                rows = children;
        });
    }
    // const action = runtime_set_style('table', {tableLayout: 'unset'});
    const navigate_on_dbl_click = (e, row) => {
        if (row.types.includes('folder')) {
            e.stopPropagation();
            navigate_to_child(row);
        }
    };
    const send_command = (cmd, id)=>use_loader(send_msg(cmd, [id]),
        'Error during sending message');
</script>

{#if !!promise}
    <Loading/>
{:else}
    <DataTable headers={[
               {value: 'Type', key: 'types', width: '100px', sort: types_sort_fn},
               {value: 'Actions', key: 'actions', width: '120px', sort: false},
               {value: 'File name', key: 'filename'},
               {value: 'Information', key: 'teststats', sort: false},
               ]}
               rows={rows}
               sortable
               size="short">
        <svelte:fragment slot="title">
            <div style="display: flex; flex-direction: column">
                <div style="display: flex; flex-direction: row">
                    <Breadcrumb style="width: 100%">
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
                    <div style="width: 30%; margin-right: 8px; display: flex; flex-direction: row;">
                        {#each Object.entries(filters) as [key, [icon, txt]]}
                            {@const isSelected = selected_file_types.includes(key)}
                            <Button {icon}
                                    size="field"
                                    style="width: 42px; height: 42px; align-items: center"
                                    iconDescription={txt}
                                    kind={isSelected ? 'primary' : 'ghost'}
                                    on:click={()=>{
                                    selected_file_types = isSelected
                                        ? selected_file_types.filter(x=>x!=key)
                                        : selected_file_types.concat([key])
                                }}
                            />
                        {/each}
                        <Search bind:value={_search}
                                on:change={()=>search = _search}
                                on:clear={()=>search = _search}/>
                    </div>
                </div>
                <RunningTests {dirname}/>
            </div>
        </svelte:fragment>
        <svelte:fragment slot="cell" let:row let:cell>
            <div style="background: transparent;"
                 on:dblclick={e=>navigate_on_dbl_click(e, row)}>

                <TypesCell {row} {cell}/>
                <FilenameCell {row} {cell} on_folder_click={e=>navigate_on_dbl_click(e, row)}/>
                <TestStatCell {row} {cell}/>
                <ActionsCell {row} {cell} {send_command}/>
            </div>
        </svelte:fragment>
    </DataTable>
{/if}
