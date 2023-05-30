<script>
    import {
        SkeletonPlaceholder, FormLabel, TextInputSkeleton,
        CodeSnippet, Select, SelectItem, Toggle, TooltipDefinition, NumberInput, ToggleSkeleton
    } from 'carbon-components-svelte';
    import {dur2str, mls, date_format, str2dur} from '../utils.js';
    import {use_reactive_ctx, on_catch} from './ctx.js';

    /**
     * @typedef {Object} Attendance
     * @property {string} username (save in local storage)
     * @property {string} avatar
     * @property {number} today
     * @property {number} month (save in local storage)
     * @property {boolean} online
     * @property {string} currency (save in local storage)
     * @property {number} dollar_per_hour (save in local storage)
     * @property {Date} date
     * @property {string} timesheet_date (save in local storage)
     */
    const currencies = new Map([
        ['$', {code: 'usd', tooltip: 'Dollar'}],
        ['₪', {code: 'ils', tooltip: 'Shekel'}],
        ['€', {code: 'eur', tooltip: 'Euro'}],
        ['£', {code: 'gbp', tooltip: 'Pound'}],
        ['₽', {code: 'rub', tooltip: 'Ruble'}],
        ['¥', {code: 'cny', tooltip: 'Yuan'}],
    ]);
    /**
     * @type {Writable<Attendance>}
     */
    let attendance = use_reactive_ctx('attendance', {
        username: 'arkadii',
        dollar_per_hour: 1,
        currency: '$',
    }, 'username month currency dollar_per_hour timesheet_date'.split(' '))
    let currency = use_reactive_ctx('currency', {},
        ['date', ...Array.from(currencies.keys())]);
    const is_today = date=>date==date_format(new Date(), 'yyyy-MM-dd');
    const request_currency = async()=>{
        if (is_today($currency.date))
            return;

        let res = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.json');
        if (!res.ok)
            throw new Error(await res.text());

        let {date, usd} = await res.json();
        res = {date};
        for (let [sign, {code}] of Array.from(currencies.entries()))
            res[sign] = usd[code];
        $currency = res;
    };
    const request_attendance = async()=>{
        let res = await fetch('http://web.brightdata.com/att/daily/status?login='+$attendance.username);
        if (!res.ok)
            throw new Error(await res.text());

        let {hours: {total}, online} = await res.json();
        $attendance.today = str2dur(total);
        $attendance.online = online;
        $attendance.date = new Date();
        add_time = 0;

        if (!is_today($attendance.timesheet_date)){
            let now = new Date();
            let from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-(now.getUTCDate()>26 ? 0 : 1), 26));
            res = await fetch('http://web.brightdata.com/att/report/api/user_report/'+$attendance.username
                +`?from_date=${date_format(from, 'yyyy-MM-dd')}&to_date=${date_format(now, 'yyyy-MM-dd')}`);
            let {to_date, total_hours, avg_hours} = await res.json();
            $attendance.month = mls.h*total_hours;
            $attendance.timesheet_date = to_date;
        }
    };
    /**
     * @param endpoint {'login' | 'logout'}
     * @return {Promise<void>}
     */
    const request_login = async(endpoint)=>{
        let url = 'http://tools.brightdata.com/slack/postmessage';
        let body = {
            to: '@'+$attendance.username,
            text: endpoint
        };
        let res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            mode: 'no-cors'
        });
        let txt = await res.text()
        if (!res.ok || txt == 'err')
            throw new Error(txt);

        await request_attendance();
    }
    let month_salary, salary, tootip, add_time = 0, log_async;
    $: {
        let {tooltip: _tooltip} = currencies.get($attendance.currency);
        let modifier = $currency?.[$attendance.currency];
        let calculate = hours=>{
            if (Number.isFinite(hours)&&Number.isFinite(modifier)){
                let amount = modifier*(hours+add_time)*$attendance.dollar_per_hour/mls.h;
                return amount.toLocaleString('ru-RU', {
                    style: 'currency',
                    useGrouping: true,
                    maximumFractionDigits: 2,
                    currency: currencies.get($attendance.currency).code,
                    currencyDisplay: 'symbol',
                });
            }
        };
        month_salary = calculate($attendance.month);
        salary = calculate($attendance.today);
        tootip = _tooltip;
    }
    setInterval(()=>{
        if ($attendance.online&&$attendance.date)
            add_time = new Date()-$attendance.date;
    }, 1000);
    request_currency().catch(on_catch({title: 'Currency fetch error'}));
    request_attendance().catch(on_catch({title: 'Attendance fetch error'}));
    const toggle_online_status = async()=>{
        log_async = request_login(!$attendance.online ? 'login' : 'logout')
        .catch(on_catch({title: 'Login request'}));
    };
</script>

<div style="padding: 1em; display: flex; flex-direction: column; float: left">
    <div style="align-items: center; display: flex; flex-direction: row; width: 480px">
        <FormLabel style="vertical-align: baseline">User info</FormLabel>
        {#await log_async}
            <ToggleSkeleton style="align-items: end"/>
        {:then result}
            <Toggle bind:toggled={$attendance.online} style="align-items: end" labelA="Offline" labelB="Online" on:click={toggle_online_status}/>
        {/await}
    </div>
    <div style="display: flex; flex-direction: row; align-items: center; gap: 1em; margin-bottom: 2em">
        {#if ($attendance.username)}
            <img style="width: 8em; height: 8em; object-fit: cover; border-radius: 50%"
                 src={`http://fs.luminati.io/hr/pictures/login/${$attendance.username}.jpeg`}
                 alt={$attendance.username}/>
        {:else}
            <SkeletonPlaceholder style="width: 8em; border-radius: 50%"/>
        {/if}
        {#if ($attendance.username)}
            <h1>{$attendance.username}</h1>
        {:else}
            <TextInputSkeleton hideLabel/>
        {/if}
    </div>
    <FormLabel>Working hours</FormLabel>
    <div style="padding-left: 1em">
        <div style="display: flex; flex-direction: row; gap: 1em; align-items: end; margin-bottom: 1em">
            <div>
                <FormLabel>Today</FormLabel>
                <CodeSnippet code={dur2str($attendance.today+add_time, mls.h)} hideCopyButton
                             style="width: 180px" skeleton={!Number.isFinite($attendance.today)}/>
            </div>
            <TooltipDefinition tooltipText={tootip}>
                <CodeSnippet code={salary} hideCopyButton
                             style="width: 180px" skeleton={!salary}/>
            </TooltipDefinition>
            <Select labelText="Currency" bind:selected={$attendance.currency}>
                {#each Array.from(currencies.entries()) as [cur, {tooltip}]}
                    <SelectItem value={cur} text={`${tooltip} (${cur})`}/>
                {/each}
            </Select>
        </div>

        <div style="display: flex; flex-direction: row; gap: 1em; align-items: end">
            <div>
                <FormLabel>This month</FormLabel>
                <CodeSnippet code={dur2str($attendance.month+add_time, mls.h)} hideCopyButton
                             style="width: 180px" skeleton={!$attendance.month}/>
            </div>
            <TooltipDefinition tooltipText={tootip}>
                <CodeSnippet code={month_salary} hideCopyButton
                             style="width: 180px" skeleton={!month_salary}/>
            </TooltipDefinition>
            <NumberInput bind:value={$attendance.dollar_per_hour} min={1} max={10000}
                         label="Salary per hour ($)" style="max-width: 50px; padding-right: 0"/>
        </div>
    </div>
</div>