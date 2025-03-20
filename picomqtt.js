const
    net = require("net"),
    { EventEmitter } = require("events");

const PacketType = {
    CONNECT: 1,
    CONNACK: 2,
    PUBLISH: 3,
    //PUBACK: 4,
    //PUBREC: 5,
    //PUBREL: 6,
    //PUBCOMP: 7,
    SUBSCRIBE: 8,
    //SUBACK: 9,
    UNSUBSCRIBE: 10,
    //UNSUBACK: 11,
    PINGREQ: 12,
    //PINGRESP: 13,
    DISCONNECT: 14
}

class PicoMQTT extends EventEmitter {
    constructor(url, options = {}) {
        super();
        this._url = url;
        this._port = options.port || 1883;
        this._keepAliveS = options.keepAliveS || 60;
        this._user = options.user;
        this._password = options.password;
        this._reconnectS = options.reconnectS || 20;
        this._tcpConnected = false;
        this._client = null;
        this._reconnectT = null;
        this._heartbeatT = null;
        this._clientId = options.clientId || "picoMQTT";
    }

    static encodeString(v) {
        return String.fromCharCode(v.length >> 8, v.length & 255) + v;
    }

    static buildPacket(cmd, v, payload) {
        return String.fromCharCode(cmd, v.length + payload.length) + v + payload;
    }

    buildConnectPacket() {
        let
            flags = 0x2,    // clean session
            payload = PicoMQTT.encodeString(this._clientId);

        if (this._user && this._password) {
            flags |= 0xC0;
            payload += PicoMQTT.encodeString(this._user) + PicoMQTT.encodeString(this._password);
        }

        return PicoMQTT.buildPacket(
            PacketType.CONNECT << 4,
            PicoMQTT.encodeString("MQTT") + String.fromCharCode(4 /* protocol level */, flags, this._keepAliveS >> 8, this._keepAliveS & 255),
            payload);
    }

    handleData(data /* Uint8Array */) {
        switch (data[0] >> 4) {
            case PacketType.CONNACK:
                if (data[3] != 0)   // ret. status 0 = accepted
                    this.emit("error", new Error("connection rejected")); // most probably invalid credentials
                else
                    this.emit("connected");
                break;

            case PacketType.PUBLISH:
                const
                    td = new TextDecoder(),
                    packetL = data[1],
                    topicL = (data[2] << 8) | data[3],
                    topic = td.decode(data.slice(4, 4 + topicL)),
                    message = td.decode(data.slice(4 + topicL, 2 + packetL));                

                this.emit("message", { topic, message });

                if (data.length > packetL + 2)
                    this.handleData(data.slice(packetL + 2));  // more data

                break;
        }
    }

    cleanup(reconnect) {
        this._tcpConnected = false;

        if (this._heartbeatT) {
            clearInterval(this._heartbeatT);
            this._heartbeatT = null;
        }
        if (this._reconnectT) {
            clearTimeout(this._reconnectT);
            this._reconnectT = null;
        }

        if (this._client) {
            this._client.removeAllListeners();
            this._client.end();
            this._client = null;
        }

        this.emit("disconnected", reconnect);

        if (reconnect)
            this._reconnectT = setTimeout(this.connect.bind(this), this._reconnectS * 1000);
    }

    connect() {
        try {
            this._client = net.createConnection({ host: this._url, port: this._port, }, () => {
                this._tcpConnected = true; // tcp is connected

                this._client.write(this.buildConnectPacket());                

                this._heartbeatT = setInterval(() => {                    
                    if (this._tcpConnected)
                        try {
                            this._client.write(String.fromCharCode(PacketType.PINGREQ << 4, 0));
                        }
                        catch {
                            this.cleanup(true);
                        }
                }, (this._keepAliveS - 5) * 1000);                
            });

            this._client.on("data", this.handleData.bind(this));
            this._client.on("end", this.cleanup.bind(this, false));
            this._client.on("error", (ex) => {
                this.emit("error", ex);
                this.cleanup(true);                
            });
        }
        catch (ex) {           
            this.emit("error", ex);  
            this.cleanup(true);                       
        }
    }

    subscribe(topic) {
        if (this._tcpConnected)
            this._client.write(PicoMQTT.buildPacket(PacketType.SUBSCRIBE << 4 | 2, String.fromCharCode(1 << 8, 1 & 255), PicoMQTT.encodeString(topic) + String.fromCharCode(0)));
    }

    unsubscribe(topic) {
        if (this._tcpConnected)
            this._client.write(PicoMQTT.buildPacket(PacketType.UNSUBSCRIBE << 4 | 2, String.fromCharCode(1 << 8, 1 & 255), PicoMQTT.encodeString(topic)));
    }

    publish(topic, message) {
        if (topic.length + message.length > 127)
            throw new Error("too long");

        if (this._tcpConnected)
            this._client.write(PicoMQTT.buildPacket(PacketType.PUBLISH << 4, PicoMQTT.encodeString(topic), message));
    }

    disconnect() {
        if (this._tcpConnected)
            try {
                this._client.write(String.fromCharCode(PacketType.DISCONNECT << 4, 0));
            }
            catch { }

        this.cleanup(false);
    }
}

exports.PicoMQTT = PicoMQTT;