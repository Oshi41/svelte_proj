<script>
    let _this;
    $: _this && console.log('THIS:', _this.parentNode);
</script>

<h3 bind:this={_this}>Here</h3>