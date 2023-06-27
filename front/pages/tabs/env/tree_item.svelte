<script>
    import {Folder, Wikis, Cafe, FolderAdd, FetchUploadCloud, AccessibilityColor} from "carbon-icons-svelte";
    import {TooltipDefinition, InlineLoading, OverflowMenuItem, OverflowMenu} from "carbon-components-svelte";
    import {dur2str} from "../../../../lib/utils.js";

    export let types;
    export let filename;

    // unnecessary props
    export let id = undefined;
    export let template = undefined;
    export let children = undefined;
    export let leaf = undefined;
    export let fullpath = undefined;
    export let success = undefined;
    export let fail = undefined;
    export let avg = undefined;
    export let run_time = undefined;
    export let last_run_failed = undefined;
    // unnecessary props end


    let is_test, is_folder, is_cvs_changed, is_hidden;
    $: {
        is_test = 'selenium mocha'.split(' ').find(x => types?.includes(x));
        is_folder = types?.includes('folder');
        is_cvs_changed = types?.includes('cvs_changed');
        is_hidden = types?.includes('hidden');
    }
</script>

<div style="display: flex; flex-direction: row; align-items: center; gap: 0.5em">
    {#if is_folder && is_test}
        <TooltipDefinition tooltipText="Folder with tests">
            <FolderAdd style="fill: var(--cds-link-02)"/>
        </TooltipDefinition>
    {:else if (is_folder)}
        <Folder/>
    {/if}
    {#if !is_folder && types?.includes('selenium')}
        <TooltipDefinition tooltipText="Selenium tests">
            <Wikis style="fill: var(--cds-support-01)"/>
        </TooltipDefinition>
    {/if}
    {#if !is_folder && types?.includes('mocha')}
        <TooltipDefinition tooltipText="Mocha tests">
            <Cafe style="fill: var(--cds-link-02)"/>
        </TooltipDefinition>
    {/if}
    {#if types?.includes('cvs_changed')}
        <TooltipDefinition tooltipText="Changed file">
            <FetchUploadCloud style="fill: var(--cds-support-03)"/>
        </TooltipDefinition>
    {/if}
    {#if types?.includes('hidden')}
        <TooltipDefinition tooltipText="Hidden file">
            <AccessibilityColor style="fill: var(--cds-icon-02)"/>
        </TooltipDefinition>
    {/if}
    {#if (types?.includes('ignore'))}
        <TooltipDefinition tooltipText="Test/Folder added to ignore list">
            <s style="font-size: 14px">{filename}</s>
        </TooltipDefinition>
    {:else }
        <p>{filename}</p>
    {/if}
    {#if (last_run_failed)}
        <div>
            <InlineLoading status="error"
            />
        </div>
    {/if}
    {#if (types?.includes('running'))}
        <div>
            <InlineLoading description={'running: '+dur2str(run_time)}
                           iconDescription="Test is running"
            />
        </div>
    {/if}
    {#if (Number.isFinite(success) && Number.isFinite(fail))}
        <p style="margin-left: 2em">
            <span>Test runs: </span>
            <TooltipDefinition tooltipText="Total success runs">
                <span style="color: green; font-size: 14px">{success}</span>
            </TooltipDefinition>
            <span style="margin-left: 0.5em; margin-right: 0.5em"> / </span>
            <TooltipDefinition tooltipText="Total failed runs">
                <span style="color: red; font-size: 14px">{fail}</span>
            </TooltipDefinition>
        </p>
    {/if}
    {#if (Number.isFinite(avg))}
        <p style="margin-left: 2em">
            <span>Avg run time:</span>
            <TooltipDefinition tooltipText="Average run time (only success runs)">
                <span style="font-size: 14px">{dur2str(avg)}</span>
            </TooltipDefinition>
        </p>
    {/if}
</div>