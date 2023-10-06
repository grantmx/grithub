// import admin from "firebase-admin"
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"
import { firebaseConfig } from "../../lib/constants"
import { getStorage } from "firebase/storage";
// import serviceAccount from "./service_account.json"

const app = initializeApp(firebaseConfig)
const firebaseDB = getFirestore(app)
const firebaseStorage = getStorage(app);

export { 
    firebaseDB, 
    firebaseStorage
}