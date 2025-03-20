const
  WiFi = require("wifi").WiFi,
  { PicoMQTT } = require("./picomqtt.min");

const wifi = new WiFi();

wifi.connect({ ssid: "your-ssid", password: "your-password" }, (ex) => {
  if (ex)
    console.error(ex);
  else {
    console.log("wifi connected");

    const mqtt = new PicoMQTT("broker.hivemq.com", { clientId: board.uid });

    mqtt.on("connected", () => {
      console.log("mqtt connected");
      
      mqtt.subscribe("test/topic");

      mqtt.publish("test/topic", "you should get this");

      mqtt.publish("test/topic", "you should also get this");

      mqtt.unsubscribe("test/topic");

      mqtt.publish("test/topic", "you should not get this");
    });

    mqtt.on("message", (msg) => {
      console.log(`mqtt message -> ${msg.topic}: ${msg.message}`);
    });

    mqtt.on("error", (ex) => {
      console.log(`mqtt error -> ${ex.message || ex}`);
    });

    mqtt.on("disconnected", (reconnect) => {
      console.log(`mqtt disconnected, reconnect = ${reconnect}`); // if reconnect is true, mqtt will try to reconnect
    });

    mqtt.connect();

    setTimeout(() => {
      mqtt.disconnect();  // stop mqtt
    }, 1000 * 120);
  }
});

