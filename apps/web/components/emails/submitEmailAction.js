"use server"

import Airtable from "@/services/airtable/airtable.service";


export default async function submitEmailAction(data){
    const airtable = new Airtable({ baseTable: process.env.airTable_table_id });

    // if our honeypot has been filled out, we know it's a bot
    if( data["b_26e45841b4abf188b36813479_e04129a9c8"] !== "" ){
        return { result: "error", msg: "Please try again" }
    }

    delete data["b_26e45841b4abf188b36813479_e04129a9c8"];

    return await airtable.post({
        "fields": {
            "Email": data["fldZtEVbPJXw0mTX4"],
            "Consent": true
        }
    })
    .then(data => {
        

        return { result: "success", msg: "Thank you for subscribing" }
    })
    .catch(err => {
        console.error(err);
        return { result: "error", msg: "Please try again" }
    })
}


