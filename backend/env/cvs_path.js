import {Path_base} from "./path_base.js";
import {debounce, mls} from "../../lib/utils.js";
import {on_async} from "../utils.js";
import {Terminal} from "../terminal.js";

export class Cvs_path extends Path_base {
    constructor(zon_dor, abs_path, stat) {
        super(zon_dor, abs_path, stat);
        this._setup_tree_prop('is_cvs_changed');
        if (this.is_folder) {
            this.recheck_cvs = debounce(this._request_cvs_status.bind(this),
                {timeout: 10*mls.s});
        }
    }

    async _request_cvs_status() {
        let parent = this.parent;
        while (parent) {
            if (parent?.recheck_cvs?.is_running?.())
                return;
        }
        const {std, err} = await on_async(
            new Terminal({
                cwd: this.abs_path,
                shell: 'cvs',
                args: '-Q status'.split(' '),
            }),
            'exit',
        );

        if (err)
            return console.warn('Error during cvs check:', err);

        let lines = std.flatMap(x => x[0].split('\n'));
        let r_name = /^File: (\S+)\s+Status:/;
        let r_rel_file = /\/zon\/(.*),/;
        let rel_changes = [];
        for (let i = 0; i < lines.length; i++) {
            let name = r_name.exec(lines[i])?.[1];
            if (!name)
                continue;
            let rel_path = r_rel_file.exec(lines[i + 3])?.[1];
            if (!rel_path)
                continue;

            if (lines[i].includes('Locally'))
                rel_changes.push(rel_path);
        }
        this.flat_children.filter(x=>x.is_folder)
            .forEach(x => x.is_cvs_changed = rel_changes.includes(x.relative_path));
    }

    async on_path_change() {
        (this.is_folder ? this : this.parent)
            ?.recheck_cvs();
    }

    toJSON() {
        let json = super.toJSON();
        if (this.is_cvs_changed)
            json.types.push('cvs_changed');
        return json;
    }
}