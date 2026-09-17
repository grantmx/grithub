// bookings require at least 24 hours notice - earliest selectable date is tomorrow
export default function getMinBookingDate(){
    const date = new Date();
    date.setDate(date.getDate() + 1);

    return date.toISOString().split("T")[0];
}
