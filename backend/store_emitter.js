import {EventEmitter} from "events";

export class Store_emitter extends EventEmitter {
    /**
     * @param timeout {number} flush timeout
     * @param key_fn {(e_name: string, args: any)=>any} retrieve key from event args
     */
    constructor(timeout, key_fn) {
        super();
        this.key_fn = key_fn;
        this.mls = timeout;
        /** @type {Map<any, Map>}*/
        this.cache = new Map();
        this.start();
    }
    flush(){
        for (let [e_name, history_map] of this.cache.entries()) {
            for (let args of history_map.values()) {
                super.emit(e_name, ...args);
            }
        }
        this.cache.clear();
    }
    emit(eventName, ...args) {
        let history = this.cache.get(eventName) || new Map();
        history.set(this.key_fn(eventName, ...args), args);
        this.cache.set(eventName, history);
        return this.listenerCount(eventName) > 0;
    }
    pause(){
        clearTimeout(this.timeout);
    }
    start(){
        this.timeout = setTimeout(this.flush.bind(this), this.mls);
    }
}