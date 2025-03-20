# PicoMqtt

Kaluma library for MQTT on Raspberry Pico.

This library is based on `https://www.espruino.com/modules/MQTT.js`, but stripped down for code and memory size.

## Limitations

- QoS = 0 only
- Max. payload size 127 bytes

## How to use

Import and create object:

```
const { PicoMQTT } = require("./picomqtt.min");
...
const mqtt = new PicoMQTT("broker.hivemq.com", { clientId: board.uid });
```

Additional config parameters:
```
const mqtt = new PicoMQTT("broker.hivemq.com", { clientId: board.uid, user: "foo", password: "boo", port: 7883 });
```

Operations:
```
mqtt.on("connected", () => {
  console.log("mqtt connected");
  
  mqtt.subscribe("test/topic");

  mqtt.publish("test/topic", "you should get this");      

  mqtt.unsubscribe("test/topic");      
});
```

> See more in `example.js`
