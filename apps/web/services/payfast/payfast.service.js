import { generateSignature } from "../../lib/utils/generateSignature";


export default class PayfastService{
    constructor(){
        this.data = {
            "merchant_id": process.env.merchant_id,
            "merchant_key": process.env.merchant_key,
            "email_address": "grantmx@gmail.com",
            "amount": "100",
            "item_name": "booking"
        };

        this.passPhrase = process.env.passPhrase;

        this.data["signature"] = generateSignature(this.data, this.passPhrase);
        this.pfParamString = this.dataToString(this.data);
    }



    dataToString = (dataArray) => {
        this.pfParamString = "";
        
        for (let key in dataArray) {
            if( dataArray.hasOwnProperty(key) ){ 
                this.pfParamString +=`${key}=${encodeURIComponent(dataArray[key].trim()).replace(/%20/g, "+")}&`;
            }
        }
    
        return this.pfParamString.slice(0, -1);
    };

}