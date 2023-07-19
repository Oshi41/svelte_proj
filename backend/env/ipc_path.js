import {Cmd_path} from "./cmd_path.js";
import {debounce} from "../../lib/utils.js";
import {Test_info} from "./test_info.js";

// TODO test
export class Ipc_path extends Test_info {
    /**
     * @type {IPCApi}
     */
    ipc;

    constructor(...props) {
        super(...props);
    }

    /**
     * @param ids {Array<string>}
     * @return {Array<Ipc_path>}
     * @private
     */
    _find_children(ids) {
        this.flat_children.filter(x => ids.includes(x.abs_path));
    }

    /**
     * @param ipc {IPCApi}
     */
    connect_to_ipc(ipc) {
        this.ipc = ipc;
        this.dirty = new Set();
        this.send_to_client = setInterval(this.send_changes.bind(this), 500);

        /**
         * @param fn {(Ipc_path)=>boolean}
         * @return {(function(*): Promise<undefined|{err: string}|boolean>)|*}
         */
        const perform_command = fn=>async ids => {
            if (!this.ipc)
                return;
            for (let child of this._find_children(ids)) {
                try {
                    let res = await fn(child);
                    if (res instanceof Error)
                        throw res;
                } catch (e) {
                    console.error(e);
                    return {err: child.relative_path+ ' '+e.message};
                }
            }
            return true;
        }

        ipc.on('run_tests', perform_command(x=>x.run() || new Error('not started')));
        ipc.on('stop_tests', perform_command(x=>x.stop() || new Error('not stopped')));
        ipc.on('ignore_tests', perform_command(x=>x.add_to_ignore('selected from UI')
            || new Error('not ignored')));
        ipc.on('rm_from_ignore', perform_command(x=>x.remove_from_ignore('selected from UI')
            || new Error('not removed from ignore')));
        ipc.on('code_style', perform_command(x=>x.check_code_style()
            || new Error('not removed from ignore')));
    }

    mark_dirty() {
        if (!this.dirty)
            return this.parent?.mark_dirty();

        if (this.fullpath.includes(this.abs_path))
            this.dirty.add(this.abs_path);
    }

    async send_changes() {
        if (!this.dirty?.size || !this.ipc)
            return;

        let to_send = this.flat_children.filter(x=>this.dirty.has(x.abs_path))
            .map(x=>x.toJSON());
        this.dirty.clear();
        to_send.forEach(x=>delete x.children); // single file change
        await this.ipc.send('file_changes', to_send);
    }

    async after_path_changed() {
        await super.after_path_changed();
        this.mark_dirty();
    }
}