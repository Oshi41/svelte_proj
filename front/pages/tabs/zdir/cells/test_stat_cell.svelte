<script>
    import {
        Hourglass as Running,
        Wikis as Selenium,
        Cafe as Mocha,
        Folder,
        Stop,
        AccessibilityColor as Hidden,
        FetchUploadCloud as Cvs_changed,
        Error
    } from "carbon-icons-svelte";
    import {Loading, TooltipDefinition} from "carbon-components-svelte";
    import {dur2str, date_format} from "../../../../../lib/utils.js";

    export let cell;
    /**
     * @type {TreeFile}
     */
    export let row;
</script>

{#if cell.key == 'teststats'}
    {@const is_running = row?.types?.includes('running')}
    {@const {avg, fail, success, last_run_date, last_run_failed} = row||{}}

    {#if last_run_failed}
        <TooltipDefinition tooltipText='Last run was failed'>
            <Error/>
        </TooltipDefinition>
    {/if}
    {#if is_running}
        <TooltipDefinition tooltipText='Currently running...'>
            <Loading/>
        </TooltipDefinition>
    {/if}
    {#if [fail, success].some(x=>Number.isFinite(x))}
        <p>
            <span>Test runs: </span>
            <TooltipDefinition tooltipText="Total success runs">
                <span style="color: green; font-size: 14px">{success||0}</span>
            </TooltipDefinition>
            <span style="margin-left: 0.5em; margin-right: 0.5em"> / </span>
            <TooltipDefinition tooltipText="Total failed runs">
                <span style="color: red; font-size: 14px">{fail||0}</span>
            </TooltipDefinition>
        </p>
    {/if}
    {#if (Number.isFinite(avg))}
        <p>
            <span>Avg run time:</span>
            <TooltipDefinition tooltipText="Average run time (only success runs)">
                <span style="font-size: 14px">{dur2str(avg)}</span>
            </TooltipDefinition>
        </p>
    {/if}
    {#if last_run_date}
        <p>
            <span>Last run:</span>
            <TooltipDefinition tooltipText="Average run time (only success runs)">
                <span style="font-size: 14px">{date_format(new Date(last_run_date), 'dd.MM.yyyy hh:mm:ss')}</span>
            </TooltipDefinition>
        </p>
    {/if}
{/if}