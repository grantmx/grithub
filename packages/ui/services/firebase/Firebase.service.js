import { firebaseDB, firebaseStorage } from "."
import { collection, Timestamp, setDoc, doc, getDocs, query } from 'firebase/firestore'
import { uploadBytesResumable, ref } from "firebase/storage";

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
        const file = fileObject[0]

        this.storageRef = ref(firebaseStorage, `${folder}/${file.name}`);
        
        const bytes = await fileObject.arrayBuffer()
        const buffer = Buffer.from(bytes)

        return await uploadBytesResumable(this.storageRef, buffer, { 
                contentType: file.type 
            })
    }
}
