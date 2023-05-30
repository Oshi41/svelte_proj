<script>
    import {use_reactive_ctx} from '../lib/ctx.js';
    import {setContext} from 'svelte';
    import {writable} from 'svelte/store';
    let auth = use_reactive_ctx('auth', {}, 'wbm_id main s1 expired'.split(' '));
    export const is_authenticated = writable(false);
    setContext('auth_tab', {is_authenticated});
    $:{
        const {wbm_id, main, s1, expired} = $auth;
        $is_authenticated = wbm_id && main && s1 && expired < new Date();
    }
</script>

<div style="padding: 2em">
</div>