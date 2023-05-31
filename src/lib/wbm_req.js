import {q2str} from '../utils.js';

const cookie_id = 'wbm_sid';
const get_cookies = ()=>{
    let raw = localStorage.getItem(cookie_id), json;
    if (!raw)
        return;
    try{
        json = JSON.parse(raw);
    } catch(e){
        console.error(e);
        return;
    }
    if (new Date(json.expires)>=new Date()){
        save_cookie();
        return;
    }
    return json[cookie_id];
};
/**
 * @param txt {string}
 */
const save_cookie = txt=>{
    if (!txt)
        return localStorage.removeItem(cookie_id);
    let json_cookie = txt.split(';').map(x=>x.split('='))
        .reduce((prev, [key, val])=>Object.assign(prev, {[key.trim()]: val.trim()}), {});
    localStorage.setItem(cookie_id, JSON.stringify(json_cookie));
    return true;
}

/**
 *
 * @return {RequestInit}
 */
const get_init = ()=>{
    return {
        mode: 'no-cors',
        credentials: 'include',
        referrerPolicy: 'unsafe-url',
        headers: {
            ...(get_cookies()&&{Cookie: get_cookies()}),
            Host: 'web.brightdata.com',
            Origin: 'http://web.brightdata.com',
            Referer: 'http://web.brightdata.com/',
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }
    };
}

/**
 * @param url {URL}
 * @return {Promise<Response>}
 */
export const get = url=>fetch(url, get_init());

/**
 * @param url {URL}
 * @param body {any}
 * @return {Promise<Response>}
 */
export const post_json = (url, body)=>fetch(url, {
    ...get_init(),
    method: 'POST',
    ...(body && {body: JSON.stringify(body)}),
});

export const is_authorized = ()=>{
    return !!get_cookies();
}

export const is_authorized_async = async()=>{
    if (!is_authorized())
        return false;
    let res = await get('http://web.brightdata.com/whoami');
    res = await res.json();
    return !!res.logged_in;
};

export const auth = async(login, passwd)=>{
    let q = {login, passwd};
    let res = await post_json('http://web.brightdata.com/auth'+q2str(q));
    if (!res.ok)
        throw new Error(await res.text());

    if (!save_cookie(res.headers.get('set-cookie')))
        throw new Error('cannot save cookies');

    return true;
}