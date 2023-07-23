const { createHash } = await import('node:crypto');


export const generateSignature = (data, passPhrase = null) => {
    // Create parameter string
    let pfOutput = "";

    for (let key in data) {
        if(data.hasOwnProperty(key)){
            if (data[key] !== "") {
                pfOutput +=`${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`
            }
        }
    }

    // Remove last ampersand
    let getString = pfOutput.slice(0, -1);
    
    if (passPhrase !== null) {
        getString +=`&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
    }

    return createHash("md5").update(getString).digest("hex");
};