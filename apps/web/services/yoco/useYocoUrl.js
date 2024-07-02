import axios from "axios";
import { useEffect, useState } from "react";

const callbackUrl = "https://grithub.org.za/"

export default function useYocoUrl(){
    const [ url, setUrl ] = useState("")

    useEffect(() => {
        axios({
            method: "POST",
            url: "/api/yoco/getCheckoutUrl",
            headers: {
                "Content-Type": "application/json",
            },
            data: {
                amount: parseInt(3500)*100,
                currency: "ZAR",
                processingMode: "test",
                cancelUrl: `${callbackUrl}cancel`,
                successUrl: `${callbackUrl}success`,
                failureUrl: `${callbackUrl}cancel`,
                metadata: {
                    name: "Code Masterclass",
                },
                lineItems: [
                    {
                        displayName: "Code Masterclass",
                        quantity: 1,
                        pricingDetails: {
                            price: parseInt(3500) * 100
                        }
                    }
                ]
            }
            
        }).then((res) => {
            setUrl(res)
        })

    }, [])


    return url

}