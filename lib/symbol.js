const {Emitter, CompositeDisposable} = require('via');
const axios = require('axios');

const Helpers = require('./helpers');
const urlV1 = 'https://api.bitfinex.com/v1';
const urlV2 = 'https://api.bitfinex.com/v2';

module.exports = class Symbol {
    static all(){
        return axios.get(`${urlV1}/symbols_details`).then(response => response.data);
    }

    constructor(params, websocket){
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.websocket = websocket;

        this.id = params.pair.toUpperCase();
        this.base = this.id.slice(0, 3);
        this.quote = this.id.slice(3);
        this.name = `${this.base}-${this.quote}`;
        this.identifier = 'BITFINEX:' + this.name;
        this.exchange = 'bitfinex';
        this.categories = ['Bitfinex'];
        this.description = 'Bitfinex';
        this.available = true;
        this.marginEnabled = params.margin;

        this.baseMinSize = parseFloat(params.minimum_order_size);
        this.baseMaxSize = parseFloat(params.maximum_order_size);
        this.baseIncrement = this.baseMinSize;
        this.basePrecision = params.price_precision;

        this.quoteMinPrice = 0;
        this.quoteMaxPrice = 0;
        this.quoteIncrement = 0;
        this.quotePrecision = params.price_precision;

        this.granularity = 60000; //Smallest candlestick size available
        this.precision = params.price_precision; //Number of decimal places to support
        this.minNotional = 0;

        this.aggregation = params.price_precision; //Number of decimal places to round to / group by for display purposes
    }

    data({granularity, start, end}){
        //TODO, eventually we will probably allow charting of funding products that are prefixed with an "f", instead of "t"
        const timeframe = Helpers.timeframes[granularity];
        const params = {start: start.getTime(), end: end.getTime()};

        if(!timeframe){
            //TODO, eventually implement a method to allow for a wider variety of time frames
            throw new Error('Invalid timeframe requested.');
        }

        return axios.get(`${urlV2}/candles/trade:${timeframe}:t${this.id}/hist`, {params}).then(response => response.data.map(Helpers.data))
    }

    history(){
        // return axios.get(`${url}/aggTrades`, {params: {symbol: this.id}}).then(response => response.data.map(Helpers.history));
    }

    orderbook(callback){
        //Get the orderbook via an HTTP request and fire a snapshot event if we are still subscribed
        //TODO Check to make sure we're still subscribed before firing the callback to nowhere
        // axios.get(`${url}/depth`, {params: {symbol: this.id}})
        // .then(result => callback({type: 'snapshot', bids: result.data.bids, asks: result.data.asks}))
        // .catch(() => {}); //TODO Somehow handle this error
        //
        // return this.websocket.subscribe(`${this.id.toLowerCase()}@depth`, message => {
        //     const changes = [];
        //
        //     for(const bid of message.b) changes.push(['buy', bid[0], bid[1]]);
        //     for(const ask of message.a) changes.push(['sell', ask[0], ask[1]]);
        //
        //     callback({type: 'update', changes});
        // });
    }

    matches(callback){
        //TODO Verify ticker integrity by checking against the sequence number
        // return this.websocket.subscribe(`${this.id.toLowerCase()}@aggTrade`, message => callback(Helpers.matches(message)));
    }

    ticker(callback){
        //TODO, eventually we will probably allow charting of funding products that are prefixed with an "f", instead of "t"
        //TODO Verify ticker integrity by checking against the sequence number
        return this.websocket.subscribe(`t${this.id}`, 'ticker', data => {
            if(Array.isArray(data)){
                //https://docs.bitfinex.com/v2/reference#ws-public-ticker
                //It's hidden under the "Update" column on the right
                //FYI - this is the data provided by the ticker so you don't have to find it later
                //0: BID, 1: BID_SIZE, 2: ASK, 3: ASK_SIZE, 4: DAILY_CHANGE
                //5: DAILY_CHANGE_PERC, 6: LAST_PRICE, 7: VOLUME, 8: HIGH, 9: LOW
                // console.log(Helpers.ticker(data));
                callback(Helpers.ticker(data));
            }
        });
    }
}
