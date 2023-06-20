<script>
    // region Requests
    import {str2dur, date_format, mls, q2str, today} from '../../../lib/utils.js';
    import {wbm_fetch} from '../../lib/gluon_lib.js';

    /**
     * Requests all currencies
     * @param map {Map<string, {code: string, tooltip: string}>}
     * @return {Promise<any>}
     */
    const request_currency = async (map) => {
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
    const request_today_attendance = async username => {
        let res = await fetch('http://web.brightdata.com/att/daily/status?login=' + username);
        if (!res.ok)
            throw new Error(await res.text());
        let {hours: {total}, online, history} = await res.json();
        let first_checkin = history.filter(x => {
            if (!x.is_in)
                return false;
            let d = new Date(x.att_time), now = new Date(), f = 'yyyy-MM-dd';
            return date_format(d, f) == date_format(now, f);
        }).pop();
        if (first_checkin)
            first_checkin = new Date(first_checkin.att_time);
        return {
            online, today: str2dur(total), date: new Date(),
            ...(first_checkin && {first_checkin})
        };
    }

    /**
     * Requests info attendance about this billing month
     * @param username {string}
     * @return {Promise<{month: number, timesheet_date: string}>}
     */
    const request_this_month_attendance = async username => {
        let now = new Date();
        let from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (now.getUTCDate() > 26 ? 0 : 1), 26));
        let res = await fetch('http://web.brightdata.com/att/report/api/user_report/' + username
            + `?from_date=${date_format(from, 'yyyy-MM-dd')}&to_date=${date_format(now, 'yyyy-MM-dd')}`);
        if (!res.ok)
            throw new Error(await res.text());
        const {to_date, total_hours, avg_hours} = await res.json();
        return {
            month: mls.h * total_hours,
            timesheet_date: to_date,
        };
    }

    /**
     * Post login/logout
     * @param username {string}
     * @param was_online {boolean}
     * @return {Promise<{today: number, online: boolean, date: Date}>}
     */
    const send_login = async (username, was_online) => {
        let url = `http://web.brightdata.com/att/daily/${was_online ? 'login' : 'logout'}`
            + `?login=${username}`;
        let now = new Date();
        let body = {
            from: 'home',
            target: username,
            login: username,
            offset: now.getTimezoneOffset(),
            time: date_format(now, 'yyyy-MM-dd hh:mm:ss'),
        };
        let res = await wbm_fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(await res.text());
        return true;
    };

    /**
     * @param who {string} username
     * @param work_start {Date}
     * @return {Promise<Map<string, CVSFile>>}
     */
    const request_commits = async (who, work_start) => {
        let q = {
            sortby: 'date',
            from_date: date_format(work_start, 'yyyy-MM-dd hh:mm:ss'),
            who,
            limit: 100,
        };
        let url = 'http://cvs.brightdata.com:3343/cvs.json' + q2str(q);
        let commits = await wbm_fetch(url);
        let result = new Map();
        for (let {ad, rm, description, path, prevrevision: r1, revision: r2, ci_when} of commits) {
            let files = result.get(description)
            if (!files) {
                files = [];
                result.set(description, files);
            }
            q = {r1, r2};
            files.push({
                link: 'http://cvs.brightdata.com/cvs/' + path + q2str(q),
                text: path,
                when: new Date(ci_when),
                meta: `+${ad} / -${rm}`,
            })
        }
        return result;
    }

    const is_today = date => date_format(new Date(), 'yyyy-MM-dd') == date;

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
     * @property {Date} first_checkin
     */

    /**
     * @typedef {Object} CVSFile
     * @property {string} link
     * @property {string} text
     * @property {Date} when
     * @property {string} meta
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

    import {lc_json_writable_store} from '../../lib/svelte_utils.js';
    import {dur2str} from '../../../lib/utils.js';
    import {get_username} from '../../lib/gluon_lib.js';
    import {getContext} from 'svelte';
    import Clock from '../../component/clock.svelte';

    const {async_toast_err} = getContext('toast');
    const app_settings = getContext('app_settings');
    const base_offsets = [{offset: 0, name: 'UTC'}, {offset: 60 * 3, name: 'Office time'}];
    let time_zones = [...base_offsets];

    const currencies = new Map([
        ['$', {code: 'usd', tooltip: 'Dollar'}],
        ['₪', {code: 'ils', tooltip: 'Shekel'}],
        ['€', {code: 'eur', tooltip: 'Euro'}],
        ['£', {code: 'gbp', tooltip: 'Pound'}],
        ['₽', {code: 'rub', tooltip: 'Ruble'}],
        ['¥', {code: 'cny', tooltip: 'Yuan'}],
    ]);
    /** @type {Writable<Attendance>}*/
    const attendance = lc_json_writable_store('attendance', {
        username: '',
        dollar_per_hour: 1,
        currency: '$',
    }, 'username month currency dollar_per_hour timesheet_date');
    const currency = lc_json_writable_store('currency', {},
        ['date', ...Array.from(currencies.keys())]);

    let add_time = 0, month_salary, salary, currency_name, loading, promise, commits;
    $: {
        currency_name = currencies.get($attendance.currency).tooltip;
        let modifier = $currency[$attendance.currency];
        let calculate = hours => {
            if (Number.isFinite(hours) && Number.isFinite(modifier)) {
                let amount = modifier * (hours + add_time) * $attendance.dollar_per_hour / mls.h;
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
        loading = promise != null || !$attendance.username || !Number.isFinite($attendance.today)
            || !Number.isFinite($attendance.month);
    }
    $: {
        let arr = [...base_offsets];
        let offset = $app_settings.local_offset;
        if (offset)
            arr.push({offset, name: 'Local time'});
        time_zones = [...arr];
    }
    setInterval(() => {
        if ($attendance.online && $attendance.date)
            add_time = new Date() - $attendance.date;
    }, 1000);


    const toggle = () => {
        promise = send_login($attendance.username, $attendance.online)
            .catch(async_toast_err('Login/logout error'))
            .finally(() => request_today_attendance($attendance.username))
            .then(v => attendance.update(src => Object.assign(src, v)))
            .catch(async_toast_err('Today attendance fetch error'))
            .finally(x => promise = null);
    };

    let requests = [
        request_today_attendance($attendance.username)
            .then(v => attendance.update(src => Object.assign(src, v)))
            .then(() => request_commits($attendance.username, $attendance.first_checkin || today()))
            .then(r => commits = r)
            .catch(async_toast_err('Today attendance fetch error')),
    ];
    if (!$attendance.username) {
        requests.push(get_username()
            .then(v => $attendance.username = v)
            .catch(async_toast_err('Err during get username'))
        );
    }
    if (!is_today($attendance.timesheet_date)) {
        requests.push(request_this_month_attendance($attendance.username)
            .then(v => attendance.update(src => Object.assign(src, v)))
            .catch(async_toast_err('Month attendance fetch error'))
        );
    }
    if (!is_today($currency.date)) {
        requests.push(request_currency(currencies)
            .then(v => currency.set(v))
            .catch(async_toast_err('Currency fetch error'))
        );
    }

    promise = Promise.all(requests).finally(() => promise = null);
    // endregion
</script>

<div style="padding: 1em; display: flex; flex-direction: column; float: left">
    <div style="align-items: center; display: flex; flex-direction: row; width: 480px">
        <FormLabel style="vertical-align: baseline">User info</FormLabel>
        {#if (!loading)}
            <Toggle toggled={$attendance.online} style="align-items: end" labelA="Offline" labelB="Online"
                    on:toggle={toggle}/>
        {/if}
    </div>
    <div style="display: flex; flex-direction: row; align-items: center; gap: 1em">
        {#if (loading)}
            <SkeletonPlaceholder style="width: 8em; border-radius: 50%"/>
            <TextInputSkeleton hideLabel/>
        {:else}
            <img style="width: 8em; height: 8em; object-fit: cover; border-radius: 50%"
                 src={`http://fs.luminati.io/hr/pictures/login/${$attendance.username}.jpeg`}
                 alt={$attendance.username}/>
            <h1 style="width: 45%">{$attendance.username}</h1>
            {@const size = 10}
            <Clock style="width: {size}em; height: {size}em" {time_zones}
                   bind:offset={$app_settings.selected_clock}/>
        {/if}
    </div>
    <FormLabel style="margin-top: 2em">Working hours</FormLabel>
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
    <FormLabel style="margin-top: 2em">Today commits</FormLabel>
    <div style="padding-left: 1em">
        {#if (commits?.size > 0)}
            {#each Array.from(commits.entries()) as [descr, files]}

            {/each}
        {:else}
            No commits
        {/if}
    </div>
</div>
