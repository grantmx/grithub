import crypto from "crypto";

function signPath(path, secret){
    const decodedSecret = Buffer.from(secret.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const signature = crypto.createHmac("sha1", decodedSecret).update(path).digest("base64");

    return signature.replace(/\+/g, "-").replace(/\//g, "_");
}

export function getStaticMapUrl({ lat, lng, width = 600, height = 700, zoom = 15 }){
    const apiKey = process.env.google_static_maps_api_key;
    const signingSecret = process.env.google_static_maps_signing_secret;

    if (!apiKey || !signingSecret) return null;

    const params = new URLSearchParams({
        center: `${lat},${lng}`,
        zoom: String(zoom),
        size: `${width}x${height}`,
        scale: "2",
        markers: `color:red|${lat},${lng}`,
        key: apiKey,
    });

    const path = `/maps/api/staticmap?${params.toString()}`;
    const signature = signPath(path, signingSecret);

    return `https://maps.googleapis.com${path}&signature=${signature}`;
}
