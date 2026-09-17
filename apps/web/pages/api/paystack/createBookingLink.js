import { savePendingCoworkingBooking } from "@/services/airtable/coworkingBookings";
import { paystackBookingPageUrl } from "@/lib/constants";

export default async function handler(req, res){
    if( req.method !== "POST" ){
        return res.status(405).json({ message: "Method not allowed" });
    }

    const booking = req.body;
    const { first_name, last_name, email, cost } = booking;

    try {
        await savePendingCoworkingBooking(booking);
    } catch(err) {
        console.error("Failed to save pending co-working booking", err);
        return res.status(400).json({ message: "We couldn't start your payment. Please try again." });
    }

    const params = new URLSearchParams({
        email,
        first_name,
        last_name,
        amount: Math.round(cost),
        "read-only": "email,first_name,last_name,amount"
    });

    res.status(200).json({ redirectUrl: `${paystackBookingPageUrl}?${params.toString()}` });
}
