import { Command } from 'commander';
import { read } from 'read';
import Crypto from 'crypto';

let _verbose = false

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getFormatDateTime(date = new Date()) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    let hour = String(date.getHours()).padStart(2, '0');
    let minute = String(date.getMinutes()).padStart(2, '0');
    let second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function log(level, message) {
    if (level !== 'DEBUG' || _verbose) {
        console.log(`[${getFormatDateTime(new Date())}] [${level}] ${message}`);
    }
}

let logger = {
    debug: msg => log('DEBUG', msg),
    info: msg => log('INFO', msg),
    warn: msg => log('WARN', msg),
    error: msg => log('ERROR', msg instanceof Error ? (msg.stack || msg.message) : String(msg)),
};

let CST = { ac_id: '1', n: '200', type: '1', enc_ver: 'srun_bx1' };

let API = {
    base: '10.100.100.152',
    referer: `/srun_portal_pc?ac_id=${CST.ac_id}&theme=pro`,
    info: (jquery, ts) => {
        return `/cgi-bin/rad_user_info?callback=jQuery${jquery}_${ts}&_=${ts+1}`;
    },
    token: (jquery, ts, uid, ip) => {
        return `/cgi-bin/get_challenge?callback=jQuery${jquery}_${ts}&username=${uid}&ip=${ip}&_=${ts+2}`;
    },
    login: (jquery, ts, uid, ip, hmd5, os, dev, chksum, info) => {
        return `/cgi-bin/srun_portal?callback=jQuery${jquery}_${ts}&action=login&username=${uid}&password=%7BMD5%7D${hmd5}&os=${os}&name=${dev}&nas_ip=&double_stack=1&chksum=${chksum}&info=${info}&ac_id=${CST.ac_id}&ip=${ip}&n=${CST.n}&type=${CST.type}&captchaVal=&ap_id=&ap_ip=&mac=&_=${ts+3}`;
    }
}

function generateCallback() {
    let VERSION = '11020';
    let random = Array.from({length: 16}, () => Crypto.randomInt(0, 10)).join('');
    return `${VERSION}${random}`;
}

function parseJSONP(response) {
    return JSON.parse(
        response.substring(
            response.indexOf("(") + 1,
            response.lastIndexOf(")")
        )
    );
}

function calculateSHA1(data) {
    return Crypto.createHash('sha1').update(data, 'utf8').digest('hex');
}

function calculateHMAC_MD5(data, key) {
    return Crypto.createHmac('md5', key).update(data, 'utf8').digest('hex');
}

function calculateXENC(data, key) {
    let encoder = new TextEncoder();
    let input = typeof data === 'string' ? encoder.encode(data) : data;
    let keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
    if (!(input instanceof Uint8Array) || !(keyBytes instanceof Uint8Array)) {
        throw new TypeError('data and key must be strings or Uint8Array values.');
    }
    if (keyBytes.length < 16) {
        throw new RangeError('The key length must be at least 16 bytes.');
    }
    let alphabet = 'LVoJPiCN2R8G90yg+hmFHuacZ1OWMnrsSTXkYpUq/3dlbfKwv6xztjI7DeBE45QA';
    let n = Math.ceil(input.length / 4);
    let buffer = new Uint8Array((n + 1) * 4);
    buffer.set(input);
    // 按主机字节序处理 32 位整数。
    let littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    let view = new DataView(buffer.buffer);
    let keyView = new DataView(
        keyBytes.buffer,
        keyBytes.byteOffset,
        keyBytes.byteLength,
    );
    let v = new Uint32Array(n + 1);
    let k = new Uint32Array(4);
    for (let j = 0; j < n; j++) {
        v[j] = view.getUint32(j * 4, littleEndian);
    }
    for (let j = 0; j < 4; j++) {
        k[j] = keyView.getUint32(j * 4, littleEndian);
    }
    v[n] = input.length;
    let sum = 0;
    let z = input.length;
    let rounds = n < 26 ? 8 : 7;
    for (let round = 0; round < rounds; round++) {
        sum = (sum + 0x9e3779b9) >>> 0;
        let e = (sum >>> 2) & 3;
        for (let j = 0; j <= n; j++) {
            let y = j < n ? v[j + 1] : v[0];
            let m = ((z >>> 5) ^ (y << 2)) >>> 0;
            m = (m + (((y >>> 3) ^ (z << 4)) ^ sum ^ y)) >>> 0;
            m = (m + (k[e ^ (j & 3)] ^ z)) >>> 0;
            z = v[j] = (v[j] + m) >>> 0;
        }
    }
    for (let j = 0; j <= n; j++) {
        view.setUint32(j * 4, v[j], littleEndian);
    }
    let result = '';
    for (let i = 0; i < buffer.length; i += 3) {
        let a = buffer[i];
        let b = buffer[i + 1] ?? 0;
        let c = buffer[i + 2] ?? 0;
        result += alphabet[a >>> 2];
        result += alphabet[((a & 3) << 4) | (b >>> 4)];
        result += i + 1 < buffer.length ? alphabet[((b & 15) << 2) | (c >>> 6)] : '=';
        result += i + 2 < buffer.length ? alphabet[c & 63] : '=';
    }
    return result;
}

async function requestTimeoutRetry(url, options, {
    timeoutMs = 5000,
    retries = 5,
    retryDelayMs = 3000,
} = {}) {
    let lastError = null;

    for (let i = 1; i <= retries + 1; i++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {...options, signal: controller.signal});
            if (!response.ok) {
                throw new Error(`HTTP_${response.status}`);
            }
            const text = await response.text();
            const json = parseJSONP(text);
            return json;
        } catch(err) {
            lastError = err;
            logger.warn(err.mesage);
            if (i <= retries) {
                await sleep(retryDelayMs);
            }
        } finally {
            clearTimeout(timer);
        }
    }

    throw new Error('Retries exceeded!');
    //return { ok: false, json: {} };
}

function encodingTest(uid, pwd, ip, token) {
    let {ac_id, n, type, enc_ver} = CST;
    let hmd5 = calculateHMAC_MD5(pwd, token);

    let plainInfo = JSON.stringify({ username: uid, password: pwd, ip, acid: ac_id, enc_ver});
    let xenc = '{SRBX1}' + calculateXENC(plainInfo, token);

    let plainInfo2 = ['', uid, hmd5, ac_id, ip, n, type, xenc].join(token);
    let sha1 = calculateSHA1(plainInfo2);

    logger.debug(`HMD5: ${hmd5}`);
    logger.debug(`XENC: ${xenc}`);
    logger.debug(`SHA1: ${sha1}`);

    return {hmd5, xenc, sha1};
}

async function auth(uid, pwd, os, dev) {
    os = os.replaceAll(' ', '+');

    /* 0. Generate */
    let timestamp = Date.now();
    let jQueryCB = generateCallback();
    let opt = {
        method: 'GET',
        headers: {
            "Accept": "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01",
            "Accept-Encoding": "deflate",
            "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "Cookie": "lang=en-US",
            "Host": API.base,
            "Proxy-Connection": "keep-alive",
            "Referer": `http://${API.base}${API.referer}`,
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest"
        }
    };

    logger.info('1. Get User Information');
    let url = `http://${API.base}${API.info(jQueryCB, timestamp)}`;
    let response = await requestTimeoutRetry(url, opt);
    logger.debug(JSON.stringify(response));

    if (response.error === 'ok') {
        logger.warn('Already logged in.');
        return;
    }

    if (response.error !== 'not_online_error') {
        // unknown error
        throw new Error(response.error || response.error_msg || 'Unknown Error!');
    }

    logger.info('2. Get Token');
    let ip = response.online_ip;
    url = `http://${API.base}${API.token(jQueryCB, timestamp, uid, ip)}`;
    response = await requestTimeoutRetry(url, opt);
    logger.debug(JSON.stringify(response));

    if (response.error !== 'ok') {
        // unknown error
        throw new Error(response.error || response.error_msg || 'Unknown Error!');
    }

    let token = response.challenge;
    let encoding = encodingTest(uid, pwd, ip, token);

    logger.info('3. Logging in');
    url = `http://${API.base}${API.login(jQueryCB, timestamp, uid, ip, encoding.hmd5, os, dev, encoding.sha1, encodeURIComponent(encoding.xenc))}`;
    response = await requestTimeoutRetry(url, opt);
    logger.debug(JSON.stringify(response));

    if (response.error !== 'ok') {
        // unknown error
        throw new Error(response.error || response.error_msg || 'Unknown Error!');
    }

    logger.info('4. Get User Information Again');
    timestamp = Date.now();
    jQueryCB = generateCallback();
    url = `http://${API.base}${API.info(jQueryCB, timestamp)}`;
    response = await requestTimeoutRetry(url, opt);
    logger.debug(JSON.stringify(response));

    if (response.error !== 'ok') {
        // unknown error
        throw new Error(response.error || response.error_msg || 'Unknown Error!');
    }

    logger.info('Login successful.');
}

async function main() {
    let program = new Command();

    program
        .name('nenu-auth')
        .version('1.0.0')
        .option('-u, --username <username>', 'UID, Student ID')
        .option('-p, --password <password>', 'Password (if not provided, it will be read from the stdin)')
        .option('-s, --os <os>', 'Specify operating system. \tValues: Windows 11, Windows 10, Windows NT, Mac OS, iOS, Unix, Linux, FreeBSD, Android.', 'Linux')
        .option('-v, --verbose', 'Output detailed log');
    
    program.parse(process.argv);

    let options = program.opts();

    let username = options.username;

    if (!username) {
        username = await read({
            prompt: 'Username: ',
            silent: false
        });
    }

    if (!username) {
        throw new Error('Username must be provided.');
    }

    let password = options.password;

    if (!password) {
        password = await read({
            prompt: 'Password: ',
            silent: true,
            replace: '*'
        });
    }

    /* 密码不能为空 */
    if (!password) {
        throw new Error('Password cannot be empty.');
    }

    if (options.verbose) {
        _verbose = true;
    }

    let os = options.os.replace(' ', '+'), dev = '';

    let osList1 = ['Windows+11', 'Windows+10', 'Windows+NT'];
    let osList2 = ['Linux', 'Unix', 'FreeBSD'];
    let osList3 = ['Android', 'iOS'];

    if (osList1.includes(os)) {
        dev = 'Windows';
    } else if (osList2.includes(os)) {
        dev = 'Linux';
    } else if (osList3.includes(os)) {
        dev = 'Smartphones';
    } else if (os === 'Mac+OS') {
        dev = 'Macintosh';
    } else {
        throw new Error('Invalid operating system specified.');
    }

    await auth(username, password, os, dev);
}

main().catch((err) => {
    console.error('nenu-auth: ', err.message);
    process.exit(1);
})
