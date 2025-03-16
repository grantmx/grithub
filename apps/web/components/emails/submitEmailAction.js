"use server"



export default async function submitEmailAction(data){
    // if our honeypot has been filled out, we know it's a bot
    if( data["b_26e45841b4abf188b36813479_e04129a9c8"] !== "" ){
        return { result: "error", msg: "Please try again" }
    }

    delete data["b_26e45841b4abf188b36813479_e04129a9c8"];

    return await fetch(`https://api.airtable.com/v0/${process.env.airTable_base_id}/${process.env.airTable_table_id}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.airTable_access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "fields": {
                "Email": data["fldZtEVbPJXw0mTX4"],
                "Consent": true
            }
        })
    })
    .then(res => res.json())
    .then(data => {
        if(data.error){
            return { result: "error", msg: data?.error?.message, type: data?.error?.type }
        }

        return { result: "success", msg: "Thank you for subscribing" }
    })
    .catch(err => {
        console.error(err);
        return { result: "error", msg: "Please try again" }
    })
}


