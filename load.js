const admin = require("firebase-admin");
const EddystoneBeaconScanner = require("eddystone-beacon-scanner");
const serviceAccount = require("./roro-360c7-firebase-adminsdk-ssf5i-f8037905b3.json");

const INC_ID = 0;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://roro-360c7.firebaseio.com"
});

const database = admin.database();

function getID() {
  const date = new Date();
  const year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  let dt = date.getUTCDate();

  if (dt < 10) {
    dt = "0" + dt;
  }

  if (month < 10) {
    month = "0" + month;
  }

  return `${year}-${month}-${dt}`;
}

function throttle(fn, delay) {
  let timer;

  return function(...args) {
    if (!timer) {
      fn(...args);
      timer = setTimeout(function() {
        timer = null;
      }, delay);
    }
  };
}

function addTelemetryEntry(packet) {
  console.log("Saving reading");
  const ref = database.ref(`date/${getID()}`).push();
  ref.set({
    date: new Date().toISOString(),
    ...packet.tlm
  });
}

const throttledAddTelemetryEntry = throttle(addTelemetryEntry, 30000);

function emitEventType(beacon) {
  this.emit(beacon.type, beacon);
  this.emit("any", beacon);
}

EddystoneBeaconScanner.on(
  "updated",
  emitEventType.bind(EddystoneBeaconScanner)
);

function onEvent(id, type, callback) {
  type = type || "any";

  function callForMatch(beacon) {
    if (!id || id === beacon.id) {
      return callback(beacon);
    }
  }

  EddystoneBeaconScanner.on(type, callForMatch);
}

onEvent(this._id, "tlm", function(packet) {
  const {
    tlm: { temp }
  } = packet;
  const F = (temp * 9) / 5 + 32;
  throttledAddTelemetryEntry(packet);
});

EddystoneBeaconScanner.startScanning(true, 5000);
