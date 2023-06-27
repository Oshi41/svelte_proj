import fs from 'fs';
import os from 'os';
import path from 'path';
import pid_cwd from 'pid-cwd';
import child_process from 'child_process';
import {EventEmitter} from 'events';
import {pick, mls, debounce} from '../lib/utils.js';
import {spawn_async} from './utils.js';

class CachedArray extends Array {

    constructor(capacity = 1000) {
        super();
        this.capacity = capacity;
    }

    check_length() {
        while (this.length > this.capacity)
            this.shift();
    }

    push(...items) {
        let res = super.push(...items);
        this.check_length();
        return res;
    }

    unshift(...items) {
        let res = super.push(...items);
        this.check_length();
        return res;
    }

    splice(start, deleteCount, ...items) {
        let res = super.splice(start, deleteCount, ...items);
        this.check_length();
        return res;
    }

    clear() {
        super.splice(0, this.length);
    }
}

/**
 * @typedef {'err' | 'out' | 'in'} Stds
 * @typedef {()=>void} Closable
 * @typedef {([string, Stds])=>void} ProcListener
 * @typedef {'kill' | 'clear' | 'cwd' | 'all_commands'} Signals
 */

export class Terminal extends EventEmitter{
    static terminals = new Map();
    static all_commands = [];

    static {
        if (os.platform() == 'win32') {
            spawn_async('help').then(x => {
                let {stderr, stdout, exitCode} = x;
                if (exitCode)
                    console.error(stderr.toString('utf8'));
                else {
                    stdout = stdout.toString('utf8');
                    let reg = /^([A-Z]+)\s+/gm;
                    let msgs = stdout.match(reg).map(x => x.trim());
                    Terminal.all_commands.push(...msgs);
                }
            });
        } else {
            spawn_async('/bin/bash', ['-c', 'compgen -A function -abck']).then(x => {
                const {stderr, stdout, exitCode} = x;
                if (exitCode)
                    console.error(stderr.toString('utf8'));
                else
                {
                    let msgs = stdout.toString('utf8').split('\n');
                    Terminal.all_commands.push(...msgs);
                }
            });
        }
    }

    constructor(opts = {}) {
        super();
        this.shell = opts.shell || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash');
        /** @type {Closable[]}*/
        this.closable = [];
        /** @type {ProcListener[]}*/
        this.proc_listeners = [];
        this.ctx_files = [];
        let cwd = opts.cwd || os.homedir();
        let args = [this.shell];
        if (opts.args)
            args.push(opts.args);
        args.push({
            env: process.env,
            cwd,
            encoding: 'utf-8',
            shell: true,
            ...opts.opts||{}
        });
        let proc = child_process.spawn(...args);
        proc.once('spawn', () => {
            this.pid = proc.pid;
            /**
             * @type {[string, Stds][]}
             */
            let std = new CachedArray(2000);
            Terminal.terminals.set(proc.pid, {proc: proc, std,});
            this.upd_ctx = debounce(async () => {
                let directory = await pid_cwd(this.pid);
                let res = fs.existsSync(directory)
                    ? (await fs.promises.readdir(directory)).sort()
                    : [];
                if (res.toString() != this.ctx_files.toString())
                {
                    this.ctx_files = res;
                    this.emit('cwd_changed', this.ctx_files);
                }
            }, {timeout: 500});

            /**
             * @param source {EventEmitter}
             * @param type {Stds}
             */
            const register_listener = (source, type) => {
                const listener = data => {
                    this.on_data(data, type);
                    this.upd_ctx();
                };
                source.addListener('data', listener);
                const unsubscriber = () => {
                    source.removeListener('data', listener);
                }
                this.closable.push(unsubscriber);
            };
            register_listener(proc.stdout, 'out');
            register_listener(proc.stderr, 'err');
            register_listener(proc.stdin, 'in');
        });
        proc.on('disconnect', () =>this.handle_close('disconnected'));
        proc.on('close', this.handle_close.bind(this));
        proc.on('exit', this.handle_close.bind(this));
        proc.on('error', this.handle_close.bind(this));
    }

    /**
     * @return {{proc: ChildProcess, std: CachedArray, err_code: number | string} | undefined}
     */
    get proc() {
        return Terminal.terminals.get(this.pid);
    }

    /**
     * Handles process closing
     * @param code {string | number | Error}
     * @param sig {string}
     */
    handle_close(code, sig) {
        let proc = this.proc;
        if (proc) {
            let err = Number.isFinite(code) ? code
                : typeof sig == 'string' ? sig
                    : code?.message ? code.message : '';
            if (err)
                Object.assign(proc, {err});

            let pid = proc.proc.pid;
            setTimeout(() => {
                Terminal.terminals.delete(pid);
            }, 5 * mls.min);
        }

        while (this.closable.length)
            this.closable.pop()?.();

        super.emit('exit', proc);
    }

    /**
     * Writes command to terminal
     * @param txt some command
     */
    write(txt) {
        const {proc} = this.proc || {};
        if (proc)
            proc.stdin.write(txt + '\n');
    }

    /**
     * @param sig {Signals}
     * @return {void | boolean | string[]}
     */
    write_signal(sig) {
        const {proc, std} = this.proc || {};
        if (!proc)
            return;

        switch (sig) {
            case "all_commands":
                return Terminal.all_commands;

            case "kill":
                return proc.kill('SIGINT');

            case "clear":
                return std.clear();

            case "cwd":
                return this.ctx_files;
        }
    }

    /**
     * @param fn {ProcListener}
     * @return {Closable}
     */
    add_listener(fn) {
        this.proc_listeners.push(fn);
        const unsubscribe = () => {
            let i = this.proc_listeners.indexOf(fn);
            this.proc_listeners.splice(i, 1);
        };
        this.closable.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param chunk {Buffer}
     * @param type {Stds}
     */
    on_data(chunk, type) {
        const {proc, std} = this.proc || {};
        if (!proc)
            return;

        chunk = chunk.toString('utf8').trim();
        let entry = [chunk, type];
        std.push(entry);
        this.proc_listeners.forEach(x => x(entry));
        this.upd_ctx();
    }

    /**
     * Resolves all terminal history
     * @param length {number}
     * @return {[string, Stds][]}
     */
    load_history(length = -1) {
        const {std} = this.proc || {};
        if (!std)
            return [];
        if (length < 0 || length >= std.length)
            return std;
        return std.slice(-length);
    }
}

export const create_args = cmd=>{
    if (os.platform() == 'win32')
    {

    } else
        return ['-c', cmd];
}