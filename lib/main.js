const axios = require('axios');
const {CompositeDisposable, Disposable} = require('via');
const Websocket = require('./websocket');
const Symbol = require('./symbol');

class Bitfinex {
    constructor(){}

    async activate(){
        this.disposables = new CompositeDisposable();
        this.websocket = new Websocket();

        const symbols = await Symbol.all();

        for(const symbol of symbols){
            this.disposables.add(via.symbols.add(new Symbol(symbol, this.websocket)));
        }

        const accounts = await via.accounts.loadAccountsFromStorage('bitfinex');

        for(const account of accounts){
            this.disposables.add(via.accounts.activate(new Account(account, this.websocket)));
        }
    }

    deactivate(){
        this.websocket.destroy();
        this.disposables.dispose();
        this.disposables = null;
    }

    async account(config){
        const account = await via.accounts.add({name: config.accountName, exchange: 'bitfinex', key: Helpers.key(config)});
        this.disposables.add(via.accounts.activate(new Account(account, this.websocket)));
    }

    title(){
        return 'Bitfinex';
    }
}

module.exports = new Bitfinex();
