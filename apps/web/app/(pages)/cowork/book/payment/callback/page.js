import { redirect } from "next/navigation";
import PaystackService from "@/services/paystack/paystack.service";
import { claimPendingCoworkingBooking, recordCoworkingBooking } from "@/services/airtable/coworkingBookings";
import { sendBookingConfirmationEmail } from "@/services/emails/sendBookingConfirmationEmail";


async function PaymentCallback({ searchParams }){
    const { reference, trxref } = await searchParams ?? {};
    const paystackReference = reference ?? trxref;

    if( !paystackReference ){
        redirect("/cowork/book/cancel");
    }

    const paystack = new PaystackService();
    let transaction;

    try {
        transaction = await paystack.verifyTransaction(paystackReference);
    } catch(err) {
        console.error(err);
        redirect("/cowork/book/cancel");
    }

    if( transaction?.status !== "success" ){
        redirect("/cowork/book/cancel");
    }

    // Payment has already succeeded at this point — surface success to the customer
    // even if recovering the booking details or the Airtable/email side-effects below
    // fail, and just log for follow-up. The hosted Paystack page only round-trips the
    // customer's email/amount, so the rest of the booking is recovered from the
    // "Pending Booking Data" stashed on their Users record before checkout.
    try {
        const metadata = await claimPendingCoworkingBooking(transaction.customer?.email);

        if( !metadata ){
            console.error("No pending co-working booking found for", transaction.customer?.email, paystackReference);
        } else {
            const { created } = await recordCoworkingBooking({
                reference: paystackReference,
                amountRands: transaction.amount / 100,
                paidAt: transaction.paid_at,
                metadata
            });

            if( created ){
                await sendBookingConfirmationEmail({
                    metadata,
                    amountRands: transaction.amount / 100
                }).catch(err => console.error("Failed to send booking confirmation email", err));
            }
        }
    } catch(err) {
        console.error("Failed to record co-working booking in Airtable", err);
    }

    redirect("/cowork/book/success");
}


export default PaymentCallback;
