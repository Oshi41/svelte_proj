<script>
    import {get_zon_dirs} from '../../gluon_utils.js';
    let promise, directories = ['.zon', 'zon1'];

    export let params;
    const {async_toast_err} = params;

    promise = get_zon_dirs()
        .then(x=>directories = x)
        .catch(async_toast_err('Zon dir request error'))
        .finally(x => promise = null);
</script>

<div style="padding: 1em">
    <h5>Zon directories</h5>
</div>