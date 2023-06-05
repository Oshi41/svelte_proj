<script>
    import Tabs from '../../component/route_tabs.svelte';
    const create_tabs = ()=>{
        let res = [],  max = 1 + Math.floor(Math.random()*4);
        for (let i = 0; i<max; i++){
            res.push({
                name: '/'+i,
                label: 'zon'+i,
            })
        }
        return res;
    }
    let tabs = create_tabs();

</script>

<div>
    <h3>Environment</h3>
    <Tabs {tabs} style="padding: 1em"/>
</div>

