<script>
    // region Requests
    import {str2dur, date_format, mls} from '../utils.js';

    /**
     * Requests all currencies
     * @param map {Map<string, {code: string, tooltip: string}>}
     * @return {Promise<any>}
     */
    const request_currency = async(map)=>{
        let res = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.json');
        if (!res.ok)
            throw new Error(await res.text());
        const {date, usd} = await res.json();
        res = {date};
        for (let [sign, {code}] of Array.from(map.entries()))
            res[sign] = usd[code];
        return res;
    };

    /**
     * Request today's attendance
     * @param username {string}
     * @return {Promise<{today: number, online: boolean, date: Date}>}
     */
    const request_today_attendance = async username=>{
        let res = await fetch('http://web.brightdata.com/att/daily/status?login='+username);
        if (!res.ok)
            throw new Error(await res.text());
        let {hours: {total}, online} = await res.json();
        return {online, today: str2dur(total), date: new Date()};
    }

    /**
     * Requests info attendance about this billing month
     * @param username {string}
     * @return {Promise<{month: number, timesheet_date: string}>}
     */
    const request_this_month_attendance = async username=>{
        let now = new Date();
        let from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-(now.getUTCDate()>26 ? 0 : 1), 26));
        let res = await fetch('http://web.brightdata.com/att/report/api/user_report/'+username
            +`?from_date=${date_format(from, 'yyyy-MM-dd')}&to_date=${date_format(now, 'yyyy-MM-dd')}`);
        if (!res.ok)
            throw new Error(await res.text());
        const {to_date, total_hours, avg_hours} = await res.json();
        return {
            month: mls.h*total_hours,
            timesheet_date: to_date,
        };
    }

    /**
     * Post login/logout
     * @param username {string}
     * @param was_online {boolean}
     * @return {Promise<{today: number, online: boolean, date: Date}>}
     */
    const send_login = async(username, was_online)=>{
        let url = `http://web.brightdata.com/att/daily/${was_online ? 'login' : 'logout'}`
            +`?login=${username}`;
        let now = new Date();
        let body = {
            from: 'home',
            target: username,
            login: username,
            offset: now.getTimezoneOffset(),
            time: date_format(now, 'yyyy-MM-dd hh:mm:ss'),
        };
        let res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(await res.text());

        return await request_today_attendance(username);
    };

    const is_today = date=>date_format(new Date(), 'yyyy-MM-dd')==date;

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

    // endregion

    // region Component code
    import {
        SkeletonPlaceholder,
        FormLabel,
        TextInputSkeleton,
        CodeSnippet,
        Select,
        SelectItem,
        Toggle,
        TooltipDefinition,
        NumberInput,
        NumberInputSkeleton,
        SelectSkeleton
    } from 'carbon-components-svelte';
    import {use_reactive_ctx} from '../lib/store.js';
    import {dur2str} from '../utils.js';

    export let params;
    const {async_toast_err} = params;

    const currencies = new Map([
        ['$', {code: 'usd', tooltip: 'Dollar'}],
        ['₪', {code: 'ils', tooltip: 'Shekel'}],
        ['€', {code: 'eur', tooltip: 'Euro'}],
        ['£', {code: 'gbp', tooltip: 'Pound'}],
        ['₽', {code: 'rub', tooltip: 'Ruble'}],
        ['¥', {code: 'cny', tooltip: 'Yuan'}],
    ]);
    /** @type {Writable<Attendance>}*/
    const attendance = use_reactive_ctx('attendance', {
        username: 'arkadii',
        dollar_per_hour: 1,
        currency: '$',
    }, 'username month currency dollar_per_hour timesheet_date'.split(' '));
    const currency = use_reactive_ctx('currency', {},
        ['date', ...Array.from(currencies.keys())]);

    let add_time = 0, month_salary, salary, currency_name, loading, promise;
    $: {
        currency_name = currencies.get($attendance.currency).tooltip;
        let modifier = $currency[$attendance.currency];
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
        salary = calculate($attendance.today);
        month_salary = calculate($attendance.month + $attendance.today);
        loading = promise!=null|| !$attendance.username|| !Number.isFinite($attendance.today)
            || !Number.isFinite($attendance.month);
    }
    setInterval(()=>{
        if ($attendance.online&&$attendance.date)
            add_time = new Date()-$attendance.date;
    }, 1000);

    let requests = [
        request_today_attendance($attendance.username)
        .then(v=>attendance.update(src=>Object.assign(src, v)))
        .catch(async_toast_err('Today attendance fetch error'))
    ];
    if (!is_today($attendance.timesheet_date)){
        requests.push(request_this_month_attendance($attendance.username)
            .then(v=>attendance.update(src=>Object.assign(src, v)))
            .catch(async_toast_err('Month attendance fetch error'))
        );
    }
    if (!is_today($currency.date)){
        requests.push(request_currency(currencies)
            .then(v=>currency.set(v))
            .catch(async_toast_err('Currency fetch error'))
        );
    }

    promise = Promise.all(requests).finally(()=>promise = null);
    // endregion
</script>

<div style="padding: 1em; display: flex; flex-direction: column; float: left">
    <div style="align-items: center; display: flex; flex-direction: row; width: 480px">
        <FormLabel style="vertical-align: baseline">User info</FormLabel>
        {#if (!loading)}
            <Toggle bind:toggled={$attendance.online} style="align-items: end" labelA="Offline" labelB="Online"/>
        {/if}
    </div>
    <div style="display: flex; flex-direction: row; align-items: center; gap: 1em; margin-bottom: 2em">
        {#if (loading)}
            <SkeletonPlaceholder style="width: 8em; border-radius: 50%"/>
            <TextInputSkeleton hideLabel/>
        {:else}
            <img style="width: 8em; height: 8em; object-fit: cover; border-radius: 50%"
                 src={`http://fs.luminati.io/hr/pictures/login/${$attendance.username}.jpeg`}
                 alt={$attendance.username}/>
            <h1>{$attendance.username}</h1>
        {/if}
    </div>
    <FormLabel>Working hours</FormLabel>
    <div style="padding-left: 1em">
        <div style="display: flex; flex-direction: row; gap: 1em; align-items: end; margin-bottom: 1em">
            <div>
                <FormLabel>Today</FormLabel>
                <CodeSnippet code={dur2str($attendance.today+add_time, mls.h)} hideCopyButton
                             style="width: 180px" skeleton={loading}/>
            </div>
            <TooltipDefinition tooltipText={currency_name}>
                <CodeSnippet code={salary} hideCopyButton
                             style="width: 180px" skeleton={loading}/>
            </TooltipDefinition>
            {#if (loading)}
                <SelectSkeleton/>
            {:else }
                <Select labelText="Currency" bind:selected={$attendance.currency}>
                    {#each Array.from(currencies.entries()) as [cur, {tooltip}]}
                        <SelectItem value={cur} text={`${tooltip} (${cur})`}/>
                    {/each}
                </Select>
            {/if}
        </div>

        <div style="display: flex; flex-direction: row; gap: 1em; align-items: end">
            <div>
                <FormLabel>This month</FormLabel>
                <CodeSnippet code={dur2str($attendance.month+add_time, mls.h)} hideCopyButton
                             style="width: 180px" skeleton={loading}/>
            </div>
            <TooltipDefinition tooltipText={currency_name}>
                <CodeSnippet code={month_salary} hideCopyButton
                             style="width: 180px" skeleton={loading}/>
            </TooltipDefinition>
            {#if (loading)}
                <NumberInputSkeleton/>
            {:else }
                <NumberInput bind:value={$attendance.dollar_per_hour} min={1} max={10000}
                             label="Salary per hour ($)" style="max-width: 50px; padding-right: 0"/>
            {/if}
        </div>
    </div>
</div>

