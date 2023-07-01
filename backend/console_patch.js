import console_stamp from 'console-stamp';
console_stamp(console, {
    extend: {
        error: 1,
        warn: 2,
        info: 3,
        log: 4,
        debug: 5
    },
    level: 'log',
});

let orig = console.time;
console.time = label => {
    orig(label);
    return ()=>console.timeEnd(label);
}