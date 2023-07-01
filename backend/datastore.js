import nedb from '@seald-io/nedb';
import {debounce} from "../lib/utils.js";


/**
 * @fires Nedb#add
 * @fires Nedb#rm
 * @fires Nedb#upd
 */
export class Nedb extends nedb {
    /*** @event Nedb#add */
    /*** @event Nedb#rm */
    /*** @event Nedb#upd */

    /**
     * @param opts {Nedb.DataStoreOptions}
     */
    constructor(opts) {
        super(opts);
        /** @type {{add: Set<any>, upd: Set<any>, rm: Set<any>}}*/
        this.changes = {
            rm: new Set(),
            add: new Set(),
            upd: new Set(),
        };
    }

    /**
     * @param set {Set}
     * @param doc {any}
     * @private
     */
    _prepend_to_event(set, doc) {
        set.add(doc);
        if (!this.event_loop_fn)
            this.event_loop_fn = debounce(this._fire_events.bind(this), 1000);

        this.event_loop_fn();
    }

    _fire_events() {
        for (let [key, set] of Object.entries(this.changes).filter(([, s])=>s.size)) {
            this.emit(key, Array.from(set));
            set.clear();
        }
    }

    _addToIndexes(doc) {
        super._addToIndexes(doc);
        this._prepend_to_event(this.changes.add, doc)
    }

    _removeFromIndexes(doc) {
        super._removeFromIndexes(doc);
        this._prepend_to_event(this.changes.rm, doc);
    }

    _updateIndexes(old, doc)  {
        super._updateIndexes(old, doc);
        this._prepend_to_event(this.changes.upd, doc);
    }
}
