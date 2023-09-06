import FirebaseApp from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import { firebaseConfig } from '../../lib/constants';


export default class Firebase{
    constructor(appType){
        FirebaseApp.initializeApp(firebaseConfig[appType]);

        this.db = FirebaseApp.firestore();
        this.auth = FirebaseApp.auth();

        this.dbPersistance = this.db.enablePersistence();
    }

}