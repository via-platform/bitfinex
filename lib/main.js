const axios = require('axios');
const num = require('num');
const {CompositeDisposable, Disposable} = require('via');
const Websocket = require('./websocket');

const BaseV1 = 'https://api.bitfinex.com/v1';
const BaseV2 = 'https://api.bitfinex.com/v2';
const SocketURI = 'wss://api.bitfinex.com/ws/2';

const Timeframes = {
    6e4: '1m',
    3e5: '5m',
    9e5: '15m',
    18e5: '30m',
    36e5: '1h',
    108e5: '3h',
    216e5: '6h',
    432e5: '12h',
    864e5: '1D',
    6048e5: '7D',
    12096e5: '14D',
    2628e6: '1M'
};

class BitfinexAdapter {
    constructor(){
        this.maxCandlesFromRequest = 500;
        this.resolution = 6e4;
    }

    activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();
    }

    deactivate(){
        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    matches(symbol, callback){
        //TODO Verify ticker integrity by checking against the sequence number
        // return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), 'matches', message => callback({
        //     date: new Date(),
        //     price: num(message.price)
        // }));
    }

    ticker(symbol, callback){
        //TODO, eventually we will probably allow charting of funding products that are prefixed with an "f", instead of "t"
        const id = 't' + symbol.identifier.slice(symbol.source.length + 1).split('-').join('');

        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(id, 'ticker', data => {
            if(Array.isArray(data)){

                //FYI - this is the data provided by the ticker so you don't have to find it later
                // BID,
                // BID_SIZE,
                // ASK,
                // ASK_SIZE,
                // DAILY_CHANGE,
                // DAILY_CHANGE_PERC,
                // LAST_PRICE,
                // VOLUME,
                // HIGH,
                // LOW

                console.log(`got a message with price ${data[6]}`)

                callback({
                    date: new Date(),
                    price: num(data[6])
                });
            }
        });
    }

    orderbook(level, symbol, callback){
        // const channel = (level === 2) ? 'level2' : 'full';
        //
        // return this.websocket.subscribe(symbol.identifier.slice(symbol.source.length + 1), channel, message => {
        //     if(message.type === 'snapshot'){
        //         callback({type: message.type, bids: message.bids, asks: message.asks});
        //     }else if(message.type === 'l2update'){
        //         callback({type: 'update', changes: message.changes});
        //     }else{
        //         callback({
        //             type: message.type,
        //             time: new Date(message.time),
        //             sequence: message.sequence,
        //             id: message.order_id,
        //             size: num(message.size),
        //             price: num(message.price),
        //             side: message.side
        //         });
        //     }
        // });
    }

    async data({symbol, granularity, start, end}){
        //TODO, eventually we will probably allow charting of funding products that are prefixed with an "f", instead of "t"
        const id = 't' + symbol.identifier.slice(symbol.source.length + 1).split('-').join('');
        const timeframe = Timeframes[granularity];

        if(!timeframe){
            //TODO, eventually implement a method to allow for a wider variety of time frames
            throw new Error('Invalid timeframe requested.');
        }

        const response = await axios.get(`${BaseV2}/candles/trade:${timeframe}:${id}/hist`, {params: {start: start.getTime(), end: end.getTime()}});
        return response.data.map(([date, open, close, high, low, volume]) => ({date: new Date(date), low, high, open, close, volume}));
    }
}

module.exports = new BitfinexAdapter();
