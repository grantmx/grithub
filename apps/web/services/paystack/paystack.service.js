/**
 * Paystack Service
 * Wraps Paystack's Transaction Verify API, used to confirm payments made
 * through the hosted grithub-bookings Payment Page.
 */

export default class PaystackService {
    constructor(){
        this.headers = {
            "Authorization": `Bearer ${process.env.paystack_secret_key}`,
            "Content-Type": "application/json"
        };
    }


    async verifyTransaction(reference){
        return await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            method: "GET",
            headers: this.headers
        })
        .then(res => res.json())
        .then(data => {
            if( !data.status ){
                throw new Error(data.message ?? "Failed to verify transaction");
            }

            return data.data;
        });
    }
}
