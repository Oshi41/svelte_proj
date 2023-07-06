<script>
    import {
        TaskRemove,
        Task,
        Play,
        CheckmarkOutline,
        Stop,
    } from "carbon-icons-svelte";
    import {Button} from "carbon-components-svelte";

    export let cell;
    export let row;
    export let send_command;
    /** @param name {ZonIPC}*/
    const onclick = name=>()=>send_command(name, row.id);
</script>

{#if cell.key == 'actions'}
    {@const is_test = 'selenium mocha'.split(' ').some(x=>row?.types?.includes(x))}
    {@const is_hidden = row?.types?.includes('hidden')}
    {@const is_changed = row?.types?.includes('cvs_changed')}
    {@const is_folder = row?.types?.includes('folder')}
    {@const is_ignored = row?.types?.includes('ignored')}
    {@const is_running = row?.types?.includes('running')}

    <div style="display: flex; flex-direction: row; gap: 2px" {...$$restProps}>
        {#if !is_running && !is_ignored && is_test}
            <Button size="small" kind="ghost"
                    icon={Play}
                    on:click={onclick('run_tests')}
                    iconDescription="Schedule to run"
            />
        {/if}
        {#if is_running}
            <Button size="small" kind="danger-ghost"
                    icon={Stop}
                    on:click={onclick('stop_tests')}
                    iconDescription="Stop running tests"/>
        {/if}
        {#if !is_ignored && is_test}
            <Button size="small" kind="secondary"
                    on:click={onclick('ignore_tests')}
                    icon={TaskRemove} iconDescription="Add to ignore"/>
        {/if}
        {#if is_ignored}
            <Button size="small" kind="secondary"
                    on:click={onclick('rm_from_ignore')}
                    icon={Task} iconDescription="Remove from ignored list"/>
        {/if}
        {#if is_changed}
            <Button size="small" kind="primary"
                    on:click={onclick('code_style')}
                    icon={CheckmarkOutline}
                    iconDescription="Check code style"/>
        {/if}
    </div>
{/if}