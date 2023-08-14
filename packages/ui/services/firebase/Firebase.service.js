import { firebaseDB, firebaseStorage } from "."
import { collection, addDoc, Timestamp, setDoc, doc, getDocs, query } from 'firebase/firestore'
import { uploadBytesResumable, ref, getDownloadURL } from "firebase/storage";

export default class FirebaseService{
    constructor(){
        this.storageRef = null
    }

    async getCollection({ rootCollection, rootDocument, documentCollection }){
        const querySnapshot = await getDocs(collection(firebaseDB, rootCollection, rootDocument, documentCollection))
        const data = []
        
        querySnapshot.forEach((doc) => {
            data.push(doc.data())
        });

        return data
    }


    async setCollectionDocument({ rootCollection, rootDocument, documentCollection, key, data }){
        return await setDoc(doc(firebaseDB, rootCollection, rootDocument, documentCollection, key), {
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
