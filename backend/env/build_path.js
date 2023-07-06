import {Path_base} from "./path_base.js";
import {glob} from 'glob';
import path from "path";
import {watch} from "chokidar";
import {date_format, maxBy, mls} from "../../lib/utils.js";

export class Build_path extends Path_base {
    constructor(...props) {
        super(...props);
    }

    /**
     * @param watcher {Watcher && {build_meta: Object}}
     * @param stat {fs.Stats}
     */
    update_meta(watcher, stat) {
        const date = maxBy([stat.mtime, stat.atime, stat.birthtime, stat.ctime]);
        let offset = new Date().getTimezoneOffset() * mls.min;
        const built_today = new Set([date - offset, new Date() - offset]
            .map(x => date_format(x, 'yyyy-MM-dd'))).size == 1;
        const name = path.basename(path.dirname(file)).split('.')[1];
        Object.assign(watcher.build_meta, {date, built_today, name});
    }

    async recache_builds() {
        if (!this.zon_dir)
            return;

        if (!this.builds)
            this.builds = new Map();

        let mask = path.join(this.zon_dir, 'build.*', 'hardlink.log');
        let files = await glob(mask);
        for (let file of Array.from(this.builds.keys()).concat(files)) {
            const key = path.basename(path.dirname(file)).split('.')[1];
            const [was, now] = [this.builds.has(key), files.includes(file)];

            if (was == now) continue;

            if (was && !now) {
                this.builds.get(file).close();
                this.builds.delete(file);
            }

            if (!was && now) {
                let watcher = Object.assign(watch(file, {
                    interval: 300,
                    alwaysStat: true,
                }), {build_meta: {}});
                watcher.on('change', (path1, stat) => {
                    this.update_meta(watcher, stat);
                });
                this.builds.set(key, watcher);
            }
        }
    }

    async _zon_init() {
        await super._zon_init();
    }
}