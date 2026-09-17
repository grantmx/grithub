
/**
 * Airtable Service
 * This service is used to interact with the Airtable API.
 */

export default class Airtable {
    constructor({ baseId, baseTable }) {
        this.headers = {
            "Authorization": `Bearer ${process.env.airTable_access_token}`,
            "Content-Type": "application/json"
        };

        this.settings = {
            method: "POST",
            headers: this.headers,
        };

        this.baseUrl = `https://api.airtable.com/v0/${baseId ?? process.env.airTable_base_id}/${baseTable}`;
    }


    async create(fields, { typecast = false } = {}){
        return await this.post({
            fields,
            ...(typecast ? { typecast: true } : {})
        })
    }


    async update(recordId, fields){
        return await fetch(`${this.baseUrl}/${recordId}`, {
            method: "PATCH",
            headers: this.headers,
            body: JSON.stringify({ fields })
        })
        .then(res => res.json())
        .catch(err => {
            console.error(err);
            return { error: { message: "Error", type: "error" } }
        })
    }


    async find(filterByFormula){
        return await fetch(`${this.baseUrl}?filterByFormula=${encodeURIComponent(filterByFormula)}&maxRecords=1`, {
            headers: this.headers
        })
        .then(res => res.json())
        .then(data => data?.records?.[0] ?? null)
        .catch(err => {
            console.error(err);
            return null;
        })
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