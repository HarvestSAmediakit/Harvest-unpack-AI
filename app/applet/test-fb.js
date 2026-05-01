const { initializeApp } = require('firebase/app');
const { getFirestore, initializeFirestore, doc, getDocFromServer } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

async function run() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Success");
  } catch (e) {
    console.error("Error connecting:");
    console.error(e.message);
  }
}
run();
