import { rpc } from "@cityofzion/neon-js";
import express from "express";
import fs from "fs";
import https from "https";
import cors from "cors";
import md5 from "js-md5";
import url from "url";
import { request } from "http";

const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.crt')
}
const app = express();
app.use(express.json());
app.use(cors());

// Neo node
const rpcUrl = 'http://seed2.neo.org:20332';
const client = new rpc.RPCClient(rpcUrl);
const contract = '0x1a79316efa784177bde4de0f3690cdd2488ed009';
const event = 'Twist';

// Gacha http
const apiUrl = 'http://har.api.yishouxia.cn/APIv2/Service.aspx'
const apiKey = '89747cb3a992424ba9869567e22a810e';
const sign = 'Vr8%RI2opxxO@F5c';

const action = 'PayOut';
const deviceName = '4G90838';
const coinCount = 1;

app.listen(8080, () => {
    console.log('Http server running at http://127.0.0.1:8080');
})

https.createServer(options, app).listen(8443, () => {
    console.log('Https server running at https://127.0.0.1:8443');
});

app.get('/', (req, res) => {
    res.send('Verifier is working');
})

app.post('/verify', async (req, res) => {
    const sender = req.body.account;
    const id = req.body.tx_id;

    // Check the tx sender, event and vm stack
    const result = await checkResult(sender, id);

    if (result) {
        // Request a machine gacha
        const gacha = await requestGacha(md5(id).toUpperCase());
        if (gacha.recode === 0) {
            res.json({ 'result': result, 'gacha': gacha });
        }
        else {
            res.json({ 'result': !result, 'gacha': gacha });
        }
    }
    else {
        res.json({ 'result': false });
    }
})

const checkResult = async (sender, id) => {
    let lastBlockHeight = await client.getBlockCount() - 2;
    const topBlockHeight = lastBlockHeight + 4;
    while (true) {
        const newBlockHeight = await client.getBlockCount();
        while (lastBlockHeight < newBlockHeight) {
            lastBlockHeight += 1
            const block = await client.getBlock(lastBlockHeight - 1, true)
            for (let tx of block.tx) {
                if (tx.hash != id || tx.sender != sender) {
                    continue;
                }

                const log = await client.getApplicationLog(tx.hash);
                if (log.executions[0].notifications.length == 1) {
                    const notif = log.executions[0].notifications[0];
                    const stack = log.executions[0].stack;

                    if (notif.contract === contract && notif.eventname === event
                        && stack[0].type === 'Boolean') {
                        return stack[0].value;
                    }
                }
            }
        }
        if (newBlockHeight >= topBlockHeight) {
            return false;
        }
        await sleep(5000);
    }
}

const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
}

const requestGacha = (id) => {
    const signData = 'action='+action+'&api_key='+apiKey+'&coin_count='+coinCount.toString()+'&device_name='+deviceName+'&order_id='+id+'&sign='+sign;
    const signValue = md5(signData).toUpperCase();

    const postData = {
        action: action,
        api_key: apiKey,
        device_name: deviceName,
        order_id: id,
        coin_count: coinCount,
        sign: signValue
    };

    const postOptions = url.parse(apiUrl);
    postOptions.method = 'POST';

    return new Promise((resolve) => {
        const req = request(postOptions, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                const data = JSON.parse(chunk);
                resolve(data);
            });
        });
        req.setTimeout(6000);
        req.write(JSON.stringify(postData), 'utf8');
        req.end();
    });
}
