require('dotenv').config();

const WebSocketClient = require('websocket').client;
const TelegramBot = require('node-telegram-bot-api');

const client = new WebSocketClient();
const BTC_ADDRESS = process.env.BtcWalletAddress;
const bot = new TelegramBot(process.env.BotPrivateKey);

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function (connection) {
    bot.sendMessage(process.env.ChannelId, `Monitor started...`);
    console.log('WebSocket Client Connected');

    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });

    connection.on('close', function () {
        console.log('Connection Closed');

        //reconnect
        client.connect('wss://ws.blockchain.info/inv');
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");

            utx = JSON.parse(message.utf8Data);

            if (utx.op != 'utx')
                return

            let outGoing = 0;
            utx.x.inputs.forEach(input => {
                if (input.addr.toLowerCase() == BTC_ADDRESS.toLowerCase()) {
                    outGoing += input.value;
                }
            });

            let inComing = 0;
            utx.x.out.forEach(out => {
                if (out.addr.toLowerCase() == BTC_ADDRESS.toLowerCase()) {
                    inComing += out.value;
                }
            });

            bot.sendMessage(process.env.ChannelId, `New BTC wallet activity: ${parseFloat(inComing - outGoing) / 100000000}`);
        }
    });

    function subscribe() {
        if (connection.connected) {
            connection.sendUTF(JSON.stringify({
                "op": "addr_sub",
                "addr": BTC_ADDRESS
            }));
        }
    }

    function ping() {
        if (connection.connected) {
            connection.sendUTF(JSON.stringify({
                "op": "ping"
            }));
        }
        setTimeout(ping, 30000);
    }

    ping();
    subscribe();
});

client.connect('wss://ws.blockchain.info/inv');


