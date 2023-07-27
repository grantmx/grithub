import { firebaseDB, firebaseStorage, firebaseStorageRef } from "services/firebase";
import { collection, addDoc, Timestamp, setDoc, doc } from 'firebase/firestore'
import { uploadBytes } from "firebase/storage";


export default class FirebaseService{

    async setCollectionDocument({ rootCollection, rootDocument, collection, key, data }){
        return await setDoc(doc(firebaseDB, rootCollection, rootDocument, collection, key), {
                ...data,
                created: Timestamp.now()
            })        
    }


    async uploadFiles(folder, fileObject){
        const storageRef = firebaseStorageRef(firebaseStorage, `${folder}/${fileObject[0].name}`);

        return await uploadBytes(storageRef, fileObject, { contentType: fileObject[0].type }).then(snapshot => snapshot)
    }
}