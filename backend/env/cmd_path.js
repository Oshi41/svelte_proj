import path from "path";
import {Terminal} from "../terminal.js";
import {Test_info} from "./test_info.js";
import {all_files} from './path_base.js';

const running_queue = [];
/** @type {Cmd_path}*/
let running_cmd;

const loop_tests = () => {
    while (running_queue.length) {
        const path = running_queue.shift();
        const cmd = all_files.get(path);
        if (!cmd) continue;

        try {
            const avg = cmd._actual_run?.();
        } catch (e) {
            console.warn(e);
            continue;
        }

        if (cmd.run_terminal)
        {
            running_cmd = cmd;
            cmd.run_terminal.once('exit', () => {
                running_cmd = null;
                loop_tests();
            });
        }
    }
};

export class Cmd_path extends Test_info {
    constructor(...props) {
        super(...props);
    }

    _is_test() {
        return this.is_selenium || this.is_mocha;
    }

    running_time() {
        if (!this._is_test())
            return;

        if (this.start)
            return new Date() - this.start;

        let sum = running_cmd.running_time()||0;
        let i = running_queue.indexOf(this.abs_path);
        for (let j = 0; j <= i; j++)
        {
            sum += all_files.get(running_queue[j])?.avg||0;
        }
        return sum;
    }

    get is_running() {
        return !!this.run_terminal;
    }

    get scheduled_run(){
        return this.is_running || running_queue.includes(this.abs_path);
    }

    _actual_run() {
        this.start = new Date();
        this.run_terminal = new Terminal({
            shell: 'zmocha',
            cwd: this.is_folder ? this.abs_path : path.dirname(this.abs_path),
            args: this.is_folder ? [] : ['-T', path.basename(this.abs_path)],
        });
        this.run_terminal.once('spawn', () => {
            this.start = new Date();
        });
        this.run_terminal.once('exit', async ({err, std}) => {
            this.run_terminal = null;
            const doc = {
                file: this.relative_path,
                start: this.start,
                end: new Date(),
                result: err == 'SIGINT' ? 'canceled' : err ? 'fail' : 'success',
                type: this.is_mocha ? 'mocha' : 'selenium',
                ...err && {error: err},
            };
            await this.db.runs.insertAsync(doc);
        });

        return this.avg;
    }

    async run() {
        if (!this._is_test())
            throw new Error('Not a test');

        if (running_queue.includes(this.abs_path))
            return -1;

        if (this.is_ignored)
            throw new Error('Ignored for runs');

        running_queue.push(this.abs_path);
        loop_tests();
    }

    async stop() {
        this.run_terminal?.write_signal('kill');
    }

    async add_to_ignore(ignore_reason) {
        if (!this._is_test())
            return;

        await this.db.ignore.insertAsync({
            file: this.relative_path,
            ignore_reason,
        });
    }

    async remove_from_ignore() {
        await this.db.ignore.removeAsync({
            file: this.relative_path,
        }, {multi: true});
    }

    async check_code_style() {
        if (!this.is_folder)
            return;

        if (this.code_style_terminal)
            return true;

        this.code_style_terminal = new Terminal({
            shell: 'zlint',
            cwd: this.abs_path,
            args: ['-ca', path.basename(this.abs_path)],
        });
        this.code_style_terminal.once('exit', ({err, std}) => {
            this.code_style_terminal = null;
            std = std.flatMap(x => x[0].split('\n')).filter(x => x.endsWith(': OK'))
            this.last_code_style_check = std.length ? std[0] : undefined;
        });
        return true;
    }

    toJSON() {
        let json = super.toJSON();
        if (this.is_running)
            json.types.push('running');
        if (this.scheduled_run)
            json.ETA = this.running_time();
        return json;
    }
}