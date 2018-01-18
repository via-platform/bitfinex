const Socket = require('ws');
const {CompositeDisposable, Disposable, Emitter} = require('via');
const EventEmitter = require('events');
const SocketURI = 'wss://api.bitfinex.com/ws/2';

module.exports = class Websocket {
    constructor(options = {}){
        this.status = 'disconnected';
        this.subscriptions = [];
        this.disposables = new CompositeDisposable();
        this.emitter = new Emitter();
        this.opened = false;
        this.waitingForChannelID = new Map();
        this.channels = {};

        return this;
    }

    connect(){
        if(!this.connection){
            this.connection = via.websockets.create(SocketURI);

            this.disposables.add(this.connection.onDidOpen(this.open.bind(this)));
            this.disposables.add(this.connection.onDidClose(this.close.bind(this)));
            this.disposables.add(this.connection.onDidReceiveMessage(this.message.bind(this)));
        }

        return this;
    }

    disconnect(){
        if(this.connection){
            via.websockets.destroy(this.connection);
            this.connection = null;
            this.opened = false;
        }
    }

    open(){
        this.emitter.emit('did-open');
        this.opened = true;

        if(this.subscriptions.length){
            for(let subscription of this.subscriptions){
                this.send({
                    event: 'subscribe',
                    channel: subscription.channel,
                    symbol: subscription.symbol
                });
            }
        }else{
            this.close();
        }
    }

    send(data){
        this.connection.send(JSON.stringify(data));
    }

    close(){
        console.log("Closed connection");
        this.emitter.emit('did-close');
        this.opened = false;
    }

    message(data){
        const message = JSON.parse(data);

        if(Array.isArray(message)){
            const [chanId, data] = message;

            for(let subscription of this.subscriptions){
                if(this.getChannelId(subscription.channel, subscription.symbol) === chanId){
                    subscription.callback(data);
                }
            }
        }else{
            if(message.event === 'subscribed'){
                this.subscribed(message.channel, message.symbol, message.chanId);
            }
        }
    }

    error(){
        console.log("ERROR");
    }

    connected(){

    }

    disconnected(){

    }

    subscribed(channel, symbol, chanId){
        this.channels[channel + ':' + symbol] = chanId;
    }

    getChannelId(channel, symbol){
        return this.channels[channel + ':' + symbol];
    }

    connectedToChannel(channel, symbol){
        return !!this.subscriptions.filter(sub => sub.channel === channel && sub.symbol === symbol).length;
    }

    subscribe(symbol, channel, callback){
        const group = {symbol, channel, callback};
        this.connect();
        this.subscriptions.push(group);

        if(this.opened && !this.connectedToChannel(channel, symbol)){
            this.send({
                event: 'subscribe',
                channel,
                symbol
            });
        }

        return new Disposable(() => this.unsubscribe(group));
    }

    unsubscribe(group){
        //TODO before sending the unsubscribe message, make sure that there are no other listeners watching it
        this.send({type: 'unsubscribe', channel: group.channel, symbol: group.symbol});
        this.subscriptions.splice(this.subscriptions.indexOf(group), 1);

        if(!this.subscriptions.length){
            this.disconnect();
        }
    }

    destroy(){
        this.disconnect();
        this.disposables.dispose();
        this.subscriptions = null;
        this.emitter.emit('did-destroy');
        this.emitter = null;
    }
}
