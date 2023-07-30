import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"
import { firebaseConfig, serviceAccount } from "../../../../packages/ui/lib/constants";
import { getStorage } from "firebase/storage";


const app = initializeApp(firebaseConfig)

const firebaseDB = getFirestore(app)
const firebaseStorage = getStorage(app);

export { 
    firebaseDB, 
    firebaseStorage
}