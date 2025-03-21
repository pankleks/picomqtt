# PicoMqtt

Kaluma library for MQTT on Raspberry Pico W / Pico 2 W.

Based on `https://www.espruino.com/modules/MQTT.js` but refactored and stripped down to basic functionallity only (see limitations).

## How to use

Import and create object:

```js
const { PicoMQTT } = require("picomqtt");
...
const mqtt = new PicoMQTT("broker.hivemq.com", { clientId: board.uid });
```

Additional config parameters:
```js
const mqtt = new PicoMQTT(
  "broker.hivemq.com",
  { clientId: board.uid, user: "foo", password: "boo", port: 7883 });
```

Operations:
```js
mqtt.on("connected", () => {
  console.log("mqtt connected");
  
  mqtt.subscribe("test/topic");

  mqtt.publish("test/topic", "you should get this");      

  mqtt.unsubscribe("test/topic");      
});

mqtt.on("message", (msg) => {
  console.log(`mqtt message -> ${msg.topic}: ${msg.message}`);
});

mqtt.connect();
```

> See more in `example.js`

## Limitations

- QoS = 0 only
- Max. payload size 127 bytes
- Clear session is set
