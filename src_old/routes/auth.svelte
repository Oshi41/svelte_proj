<script>
    import {Button, PasswordInput, TextInput, TextInputSkeleton, ToastNotification} from 'carbon-components-svelte';
    import {navigateTo} from 'svelte-router-spa';
    import {get_username, is_authorized_async, wbm_fetch} from '../gluon_utils.js';
    import {q2str} from '../utils.js';

    let login, pass, promise, warn = {}, toast;
    const auth = async ()=>{
        let q = {login, passwd: pass};
        let res = await wbm_fetch('http://web.brightdata.com/auth'+q2str(q), {
            method: 'POST'
        });
        if (!res.ok)
            throw new Error(await res.text());
        return true;
    };
    const on_auth = ()=>{
        promise = auth(login, pass)
        .then(()=>navigateTo('/'))
        .catch(e=>{
            let txt = e?.message?.toLower?.();
            if (txt?.includes('login'))
                warn.login = e.message;
            else if (txt?.includes('password'))
                warn.pass = e.message;
            else toast = e.message||e.toString();
        })
        .finally(()=>promise = null);
    };

    promise = get_username()
        .then(name=>login = name)
        .then(is_authorized_async)
        .then(value=>{
            if (value)
                navigateTo('/');
        }).catch(e=>toast = 'Inner error')
        .finally(()=>promise = null);
</script>

<div style="padding: 2em; display: flex; flex-direction: column; gap: 1em; float:left;">
    <h2>Authorize</h2>

    {#if (!promise)}
        <TextInput bind:value={login} labelText="User name"
                   warnText={warn?.login}
                   warn={!!warn?.login}
                   on:change={()=>delete warn?.login}/>
        <PasswordInput bind:value={pass} labelText="Your OS password"
                       warnText={warn?.pass}
                       warn={!!warn?.pass}
                       on:change={()=>delete warn?.pass}/>
    {:else }
        <TextInputSkeleton/>
        <TextInputSkeleton/>
    {/if}
    <Button disabled={Object.keys(warn).length>0 || !pass || !login}
            on:click={on_auth}
            skeleton={!!promise}>Auth
    </Button>
    {#if toast}
        <ToastNotification kind="error" title="Auth error" subtitle={toast} timeout={5000}/>
    {/if}
</div>