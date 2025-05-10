
/**
 * Airtable Service
 * This service is used to interact with the Airtable API.
 */

export default class Airtable {
    constructor({ baseTable }) {
        this.settings = {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.airTable_access_token}`,
                "Content-Type": "application/json"
            },
        };

        this.baseUrl = `https://api.airtable.com/v0/${process.env.airTable_base_id}/${baseTable}`;
    }


    async post(data){
        return await fetch(this.baseUrl, {
            ...this.settings,
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(data => {
            if(data.error){
                return { 
                    result: "error", 
                    msg: data?.error?.message, 
                    type: data?.error?.type 
                }
            }

            return data;
        })
        .catch(err => {
            console.error(err);

            return { 
                error: { 
                    message: "Error", 
                    type: "error" 
                } 
            }
        })
    }



}