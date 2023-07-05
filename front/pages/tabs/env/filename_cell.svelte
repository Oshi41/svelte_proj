<script>
    export let cell;
    export let row;
    export let on_folder_click;
</script>

{#if cell.key == 'filename'}
    {@const is_folder = row?.types?.includes('folder')}
    {@const is_ignored = row?.types?.includes('ignored')}
    {#if is_folder}
        <u style="cursor: pointer;" on:click={on_folder_click}>
            {cell.value}
        </u>
    {:else if is_ignored}
        <s>{cell.value}</s>
    {:else}
        {cell.value}
    {/if}
{/if}