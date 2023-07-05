<script>
    import {
        Hourglass as Running,
        Wikis as Selenium,
        Cafe as Mocha,
        Folder,
        Stop,
        AccessibilityColor as Hidden,
        FetchUploadCloud as Cvs_changed,
    } from "carbon-icons-svelte";
    import {TooltipDefinition} from "carbon-components-svelte";

    export let cell;
    export let row;
</script>

{#if cell.key == 'types'}
    {@const is_changed = row?.types?.includes('cvs_changed')}
    {@const is_folder = row?.types?.includes('folder')}
    {@const is_selenium = row?.types?.includes('selenium')}
    {@const is_mocha = row?.types?.includes('mocha')}
    {@const is_ignored = row?.types?.includes('ignored')}
    {@const is_hidden = row?.types?.includes('hidden')}
    {@const is_running = row?.types?.includes('running')}

    {#if is_changed}
        <TooltipDefinition tooltipText={is_folder
                             ? 'Contains changed file' : 'Changed file'}>
            <Cvs_changed style="fill: var(--cds-support-03)"/>
        </TooltipDefinition>
    {/if}
    {#if is_running}
        <TooltipDefinition tooltipText={is_folder
                             ? 'Contains executing tests' : 'Executing test'}>
            <Running style="fill: var(--cds-support-02)"/>
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
{/if}