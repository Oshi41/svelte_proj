<script context="module">
    import {getContext, setContext} from "svelte";
    import {writable} from "svelte/store";
    import {q2str, str2q} from "../utils.js";

    export const ctx_name = '_route_meta';
    /**
     * @return {path: Writable<string>}
     */
    export const get_route_ctx = () => getContext(ctx_name);

    /** @param route {string} */
    const sanitize_route = route => route.replace(/\\/g, '/').replace(/\/+/g, '/');

    /**
     * @param route {string}
     */
    export const check_route = route => {
        let current_url = new URL(window.location.toString());
        let url = new URL('https://fake.com' + sanitize_route(route));
        let [l, r] = [url, current_url].map(x => x.pathname.split('/').filter(Boolean));
        for (let i = 0; i < l.length; i++) {
            const left = l[i];
            if (left == '*' || left.startsWith(':'))
                continue;
            if (left != r[i])
                return false;
        }
        [l, r] = [url, current_url].map(x => x.search.substring(1).split('&').filter(Boolean).map(x => x.split('='))
            .reduce((m, [key, value]) => m.set(key, value), new Map()));
        for (let [key, value] of Array.from(l.entries())) {
            if (r.get(key) != value)
                return false;
        }
        return true;
    };

    export const url_store = writable(1);
</script>

<script>
    import {onDestroy, tick} from "svelte";
    import {get} from "svelte/store";

    export let path;
    export let disabled = false;
    let visible, check_condition = true;
    const full_path = writable('');
    const {path: p_path,} = getContext(ctx_name) || {};
    const upd_state = (args) => {
        let _full_path = get(full_path);
        visible = check_condition && check_route(_full_path);
    };
    const recheck_condition = _disabled => {
        if (typeof _disabled == 'boolean')
            check_condition = !_disabled;
        else if (typeof _disabled?.then == 'function') {
            check_condition = false;
            _disabled.then(x => (check_condition = !x))
                .catch(e => console.error('Error during condition check, page will never shown:', e));
        } else if (typeof _disabled == 'function')
            check_condition = !_disabled();
        else {
            console.warn(`Unknown disabled type:`, typeof _disabled);
            check_condition = !!_disabled;
        }
    }
    $: {
        $full_path = ($p_path || '') + path;
    }
    $: recheck_condition(disabled);
    $: upd_state(check_condition && $full_path && $url_store);
    /**
     * @param pathname {string}
     * @param query {object} - query param to apply
     * @param relative {boolean} - relative to current path (nearest <Route />)
     * @param save {boolean} - save in history
     * @param strict_query_param {boolean} - apply only provided URL params
     * @param only_if_not_active {boolean} - navigate only if routte not active
     * @return {Promise<void>}
     */
    const navigate_to = async ({pathname = '', query = {}} = {}, {
        relative = true,
        save = true,
        strict_query_param = true,
        only_if_not_active = true,
    } = {}) => {
        if (relative)
            pathname = $full_path + pathname;

        pathname = pathname.replace(/\\/g, '/').replace(/\/+/g, '/').split('/').reduce((a, segment) => {
            if (segment == '.') {
                // ignore
            } else if (segment == '..')
                a.pop()
            else
                a.push(segment);
            return a;
        }, []).join('/');

        const current_url = new URL(window.location.href);

        if (strict_query_param)
            Object.assign(query, str2q(current_url.search));

        let url = new URL(current_url.origin + pathname + q2str(query));
        if (url.toString() == current_url.toString())
            return;
        let cur_route = url.href.replace(url.origin, '')
        if (only_if_not_active && check_route(cur_route))
            return;
        
        url = url.toString();
        let args = [{page: url}, '', url];
        save ? window.history.pushState(...args) : window.history.replaceState(...args);

        await tick();
        window.dispatchEvent(new Event('historychanged', {
            bubbles: true, cancelable: false, composed: false,
        }));
        url_store.update(value => value++);
    };
    setContext(ctx_name, {path: full_path, navigate_to});

    window.addEventListener('historychanged', () => {
        $url_store = window.location.href;
    });
    onDestroy(() => {
        window.removeEventListener('historychanged', upd_state);
    });
</script>

{#if !!visible}
    <slot/>
{/if}
