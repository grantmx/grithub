import { render } from "mjml-react";
import StandardEmail from "@/components/emails/StandardEmail";
import ResendService from "@/services/resend.service";
import formatPrice from "@/lib/utils/formatPrice";
import { bookingSettings, officeLocation } from "@/lib/constants";
import { getStaticMapUrl } from "@/services/google/staticMap.service";

export async function sendBookingConfirmationEmail({ metadata, amountRands }){
    const workspace = metadata.stoep_addon
        ? `${metadata.workspace} + Stoep (Outdoors)`
        : metadata.workspace;

    const duration = metadata.duration === "hourly"
        ? `Hourly (${metadata.hours} hour${metadata.hours > 1 ? "s" : ""})`
        : metadata.duration;

    const selectedAmenities = Object.entries(metadata.amenities ?? {})
        .filter(([ , checked ]) => checked)
        .map(([ key ]) => bookingSettings.amenities?.[key]?.label ?? key);

    const additionalDays = (metadata.additional_days ?? []).filter(day => day.date);

    const mapImageUrl = getStaticMapUrl({ lat: officeLocation.lat, lng: officeLocation.lng });
    const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${officeLocation.lat},${officeLocation.lng}`;

    const message = `
        <p>Hi ${metadata.first_name}, your co-working booking is confirmed. Here are the details:</p>
        <ul>
            <li><strong>Workspace</strong>: ${workspace}</li>
            <li><strong>Arrival</strong>: ${metadata.date} @ ${metadata.arrival}</li>
            ${additionalDays.map(day => `<li><strong>Additional Day</strong>: ${day.date} @ ${day.arrival}</li>`).join("")}
            <li><strong>Duration</strong>: ${duration}</li>
            ${metadata.catering_requested ? `<li><strong>Catering</strong>: Requested${metadata.catering_budget ? ` (budget: ${formatPrice(metadata.catering_budget)})` : ""}</li>` : ""}
            ${selectedAmenities.length ? `<li><strong>Add-ons</strong>: ${selectedAmenities.join(", ")}</li>` : ""}
            <li><strong>Total Paid</strong>: ${formatPrice(amountRands)}</li>
        </ul>
        <p>If you have any questions regarding your booking send us an email at
        <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or
        <a href="https://wa.me/270630705752">WhatsApp us</a>.</p>
        <p><strong>Refund Policy</strong>: In the unlikely event that we need to cancel your booking, we'll refund you.</p>
        <p><strong>Free Cancellation</strong>: All workspaces within 2 hours of venue confirmation.
        Hot Desks and Group Spaces within 24 hours before arrival time.</p>
        <p><strong>Getting Here</strong>: ${officeLocation.directions}</p>
        <p>Garden Route Innovation and Technology Hub<br/>
        ${officeLocation.address.line1}<br/>
        ${officeLocation.address.line2}</p>
        ${mapImageUrl ? `
        <p>
            <a href="${mapLinkUrl}" target="_blank" rel="noopener noreferrer">
                <img src="${mapImageUrl}" width="600" alt="Map to GRIT Hub" style="max-width:100%;border-radius:8px;" />
            </a>
        </p>` : `
        <p><a href="${mapLinkUrl}" target="_blank" rel="noopener noreferrer">View on Google Maps</a></p>`}
    `;

    const { html } = render(StandardEmail({ heading: "Your booking is confirmed", message }), { validationLevel: "soft" });

    const resend = new ResendService({
        to: metadata.email,
        subject: "Your GRIT Hub co-working booking is confirmed",
        html
    });

    return await resend.send();
}
