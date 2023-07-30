import { firebaseDB, firebaseStorage } from "services/firebase";
import { collection, addDoc, Timestamp, setDoc, doc } from 'firebase/firestore'
import { uploadBytesResumable, ref, getDownloadURL } from "firebase/storage";

export default class FirebaseService{
    constructor(){
        this.storageRef = null
    }


    async setCollectionDocument({ rootCollection, rootDocument, collection, key, data }){
        return await setDoc(doc(firebaseDB, rootCollection, rootDocument, collection, key), {
                ...data,
                created: Timestamp.now()
            })        
    }


    async uploadFiles(folder, fileObject){
        this.storageRef = ref(firebaseStorage, `${folder}/${fileObject[0].name}`);
        
        return await uploadBytesResumable(this.storageRef, fileObject, { 
                contentType: fileObject[0].type 
            })
    }
}