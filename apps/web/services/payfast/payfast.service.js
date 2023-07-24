import { generateSignature } from "../../lib/utils/generateSignature";


export default class PayfastService{
    constructor(){
        this.data = {
            "merchant_id": process.env.sandbox_merchant_id,
            "merchant_key": process.env.sandbox_merchant_key
        };

        this.passPhrase = process.env.passPhrase;

        this.data["signature"] = "49a84b05632146a410de6de41bd08ff5"

        this.data = {
            ...this.data,
            "amount": "100",
            "item_name": "booking"
        }

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