// import admin from "firebase-admin"
import firebase from "firebase/app";
import { getFirestore } from "firebase/firestore"
import { firebaseConfig } from "../../lib/constants"
import { getStorage } from "firebase/storage";
import * as admin from "firebase-admin"

const app = firebase.initializeApp(firebaseConfig)
const firebaseDB = getFirestore(app)
const firebaseStorage = getStorage(app);
const serviceAccount = require("./service_account.json")

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://grithub-admin.firebaseio.com"
})

export { 
    firebaseDB, 
    firebaseStorage
}