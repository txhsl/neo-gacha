import { rpc } from "@cityofzion/neon-js";
import express from 'express';

const app = express()
app.use(express.json());

const url = 'http://seed2.neo.org:20332';
const client = new rpc.RPCClient(url);
const contract = '0x1a79316efa784177bde4de0f3690cdd2488ed009';
const event = 'Twist';

app.listen(8080, () => {
    console.log('Express server running at http://127.0.0.1');
})

app.get('/', (req, res) => {
    res.send('Verifier is working');
})

app.post('/verify', async (req, res) => {
    let sender = req.body.account;
    let id = req.body.tx_id;
    let result = await checkResult(sender, id);

    res.json({ 'result': result, 'gacha': false});
})

const checkResult = async (sender, id) => {
    let lastBlockHeight = await client.getBlockCount() - 2;
    const topBlockHeight = lastBlockHeight + 6;
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
        await sleep(10000);
    }
}

const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
}