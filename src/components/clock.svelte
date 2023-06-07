<script>
    import {onMount} from 'svelte'
    import {Button, ButtonSet, RadioTile, TileGroup} from 'carbon-components-svelte';

    export let secondhand = true
    export let markers = 'sixty'
    export let time_zones = [];

    export let offset;
    let name, time = getNow();

    function getNow(){
        const local = -new Date().getTimezoneOffset();
        if (!Number.isFinite(offset))
            offset = local;
        return new Date(Date.now()+(+offset-local)*60000);
    }

    $: hours = time.getHours()
    $: mins = time.getMinutes()
    $: secs = time.getSeconds()
    $: steps = markers==='four' ? [0, 15, 30, 45] :
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    $: {
        let hours = Math.floor(offset/60);
        name = hours==0 ? 'UTC' : `GMT${hours>0 ? '+' : '-'}${Math.abs(hours)}`;
    }
    $: Number.isFinite(offset) && (time = getNow());

    let interval, map_zones;
    $: map_zones = new Map(time_zones.map(x=>[x.offset, x]));
    export const start = ()=>{
        interval = setInterval(()=>{time = getNow();}, 1000);
    };
    export const stop = ()=>clearInterval(interval);
    const pad = num=>String(num).padStart(2, '0');
    onMount(start);
</script>

<style>
    :host {
        display: block;
    }

    svg {
        width: 100%;
        height: 100%;
    }

    .clock-face {
        stroke: #333;
        fill: white;
    }

    .minor {
        stroke: #999;
        stroke-width: 0.5;
    }

    .major {
        stroke: #333;
        stroke-width: 1;
    }

    .hour {
        stroke: #333;
    }

    .minute {
        stroke: #666;
    }

    .second, .second-counterweight {
        stroke: rgb(180, 0, 0);
    }

    .second-counterweight {
        stroke-width: 3;
    }
</style>

<div style="display: flex; flex-direction: row;">
    <div style="display: flex; flex-direction: column; gap: 4px; padding: 4px; {$$props.style}">
        <svg viewBox='-50 -50 100 100'>
            <circle class='clock-face' r='48'/>

            <!-- markers -->
            {#if markers!=='none'}
                {#each steps as minute}
                    <line
                            class='major'
                            y1='35'
                            y2='45'
                            transform='rotate({30 * minute})'
                    />

                    {#if markers==='sixty'}
                        {#each [1, 2, 3, 4] as offset}
                            <line
                                    class='minor'
                                    y1='42'
                                    y2='45'
                                    transform='rotate({6 * (minute + offset)})'
                            />
                        {/each}
                    {/if}
                {/each}
            {/if}

            <!-- hour hand -->
            <line
                    class='hour'
                    y1='2'
                    y2='-20'
                    transform='rotate({30 * hours + mins / 2})'
            />

            <!-- minute hand -->
            <line
                    class='minute'
                    y1='4'
                    y2='-30'
                    transform='rotate({6 * mins + secs / 10})'
            />

            <!-- second hand -->
            {#if secondhand}
                <g transform='rotate({6 * secs})'>
                    <line class='second' y1='10' y2='-38'/>
                    <line class='second-counterweight' y1='10' y2='2'/>
                </g>
            {/if}
        </svg>
        <div style="text-align: center;">
            <span>{pad(hours)}:{pad(mins)}{secondhand ? ':'+pad(secs) : ''} {name}</span>
        </div>
    </div>
    {#if (time_zones?.length)}
        <ButtonSet stacked style="flex-direction: column-reverse; gap: 1px">
            {#each Array.from(time_zones.values()) as time_zone}
                {@const {offset: cur_offset, name} = time_zone}
                {@const kind = cur_offset==offset ? 'primary' : 'secondary'}
                <Button style="padding: 0; width: 3.5em; height: 1em; text-align: center; min-height: 3em" {kind}
                        on:click={()=> kind == 'secondary' && (offset = cur_offset)}>
                    <p style="font-size: 13px; width: 100%">{name}</p>
                </Button>
            {/each}
        </ButtonSet>
    {/if}
</div>
