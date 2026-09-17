import Airtable from "@/services/airtable/airtable.service";
import { bookingSettings } from "@/lib/constants";

const baseId = process.env.airTable_coworking_base_id;

const TABLES = {
    bookings: "tblWRwCc8Hf9VFBAn",
    users: "tblDZ2X8Xi6AkCINy",
    payments: "tbl2YtSb0A0zDZW6i"
};


function escapeFormulaValue(value){
    return String(value).replace(/"/g, '\\"');
}


function addHoursToTime(time, hours){
    if( !time || !hours ) return undefined;

    const [ h, m ] = time.split(":").map(Number);
    const totalMinutes = (h * 60 + m) + (hours * 60);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;

    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}


function buildNotes(metadata, dayIndex, totalDays){
    const notes = [];

    if( metadata.workspace_id === "hot_desk" || metadata.workspace_id === "sandbox_lounge" ){
        notes.push(`Guests: ${metadata.guests}`);
    }

    notes.push(`Duration: ${metadata.duration}${metadata.duration === "hourly" ? ` (${metadata.hours}h)` : ""}`);

    if( totalDays > 1 ){
        notes.push(`Day ${dayIndex + 1} of ${totalDays}`);
    }

    if( metadata.stoep_addon ){
        notes.push("+ Stoep (Outdoors) addon");
    }

    if( metadata.catering_requested ){
        notes.push(`Catering requested${metadata.catering_budget ? ` (budget: R${metadata.catering_budget})` : ""}`);
    }

    const selectedAmenities = Object.entries(metadata.amenities ?? {})
        .filter(([ , checked ]) => checked)
        .map(([ key ]) => bookingSettings.amenities?.[key]?.label ?? key);

    if( selectedAmenities.length ){
        notes.push(`Add-ons: ${selectedAmenities.join(", ")}`);
    }

    if( metadata.notes ){
        notes.push(`Special Notes: ${metadata.notes}`);
    }

    return notes.join(" | ");
}


/**
 * Stashes the full booking form data on the customer's Users record before handing off to
 * Paystack's hosted payment page, which only carries email/name/amount back on redirect.
 * Requires a "Pending Booking Data" long text field on the Users table.
 */

export async function savePendingCoworkingBooking(metadata){
    const usersTable = new Airtable({ baseId, baseTable: TABLES.users });

    let userRecord = await usersTable.find(`{Email} = "${escapeFormulaValue(metadata.email)}"`);

    if( !userRecord ){
        userRecord = await usersTable.create({
            "First Name": metadata.first_name,
            "Last Name": metadata.last_name,
            "Email": metadata.email,
            "Phone/WhatsApp Number": metadata.phone
        });
    }

    await usersTable.update(userRecord.id, {
        "Pending Booking Data": JSON.stringify(metadata)
    });
}


/**
 * Recovers and clears the pending booking data stashed for this email by
 * savePendingCoworkingBooking, once Paystack confirms the payment succeeded.
 */

export async function claimPendingCoworkingBooking(email){
    const usersTable = new Airtable({ baseId, baseTable: TABLES.users });

    const userRecord = await usersTable.find(`{Email} = "${escapeFormulaValue(email)}"`);
    const pendingData = userRecord?.fields?.["Pending Booking Data"];

    if( !pendingData ){
        return null;
    }

    await usersTable.update(userRecord.id, { "Pending Booking Data": "" });

    try {
        return JSON.parse(pendingData);
    } catch(err) {
        console.error("Failed to parse pending booking data", err);
        return null;
    }
}


/**
 * Records a paid co-working booking in Airtable (Users, Co-Working Bookings, Payments tables),
 * idempotently keyed on the Paystack reference.
 */

export async function recordCoworkingBooking({ reference, amountRands, paidAt, metadata }){
    const paymentsTable = new Airtable({ baseId, baseTable: TABLES.payments });

    const existingPayment = await paymentsTable.find(`{Payment ID} = "${escapeFormulaValue(reference)}"`);

    if( existingPayment ){
        return { created: false };
    }

    const usersTable = new Airtable({ baseId, baseTable: TABLES.users });
    const bookingsTable = new Airtable({ baseId, baseTable: TABLES.bookings });

    let userRecord = await usersTable.find(`{Email} = "${escapeFormulaValue(metadata.email)}"`);

    if( !userRecord ){
        userRecord = await usersTable.create({
            "First Name": metadata.first_name,
            "Last Name": metadata.last_name,
            "Email": metadata.email,
            "Phone/WhatsApp Number": metadata.phone
        });
    }

    // one Airtable booking entry per day, so venue staff can track entrance for each day booked
    const days = [
        { date: metadata.date, arrival: metadata.arrival },
        ...(metadata.additional_days ?? []).filter(day => day.date)
    ];

    const bookingRecords = [];

    for( const [ dayIndex, day ] of days.entries() ){
        const bookingRecord = await bookingsTable.create({
            "Booking ID": days.length > 1 ? `${reference}-day${dayIndex + 1}` : reference,
            "User": [ userRecord.id ],
            "Co-Working Space Name": metadata.workspace,
            "Booking Date": day.date,
            "Start Time": day.arrival,
            ...(metadata.duration === "hourly" ? { "End Time": addHoursToTime(day.arrival, metadata.hours) } : {}),
            "Status": "Confirmed",
            "Notes": buildNotes(metadata, dayIndex, days.length)
        });

        bookingRecords.push(bookingRecord);
    }

    await paymentsTable.create({
        "Payment ID": reference,
        "User": [ userRecord.id ],
        "Co-Working Booking": bookingRecords.map(record => record.id),
        "Payment Amount": amountRands,
        "Payment Method": "Paystack",
        "Payment Timestamp": paidAt
    }, { typecast: true });

    return { created: true, userRecord, bookingRecords };
}
