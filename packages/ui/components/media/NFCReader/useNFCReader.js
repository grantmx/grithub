import { useEffect, useState } from "react";


export default function useNFCReader(){
    const [ results, setResults ] = useState([])
    const [ error, setError ] = useState([])

    useEffect(() => {
        let abortController = new AbortController();

        
        if ("NDEFReader" in window) {
            let ndef;
            let NFCResults = [];

            async function scanNFCTags(){
                if ( !ndef ) {

                    abortController.signal.onabort = event => {
                        // All NFC operations have been aborted.
                        console.log(event);
                    };

                    ndef = new NDEFReader();

                    ndef.onreadingerror = () => {
                        console.log("Cannot read data from the NFC tag. Try another one?");
                    };

                    ndef.onreading = event => {
                        console.log("NDEF message read.");
                        console.log(event);

                        NFCResults = [];
                        NFCResults = NFCResults.concat(event.message.records);

                        setResults(NFCResults)
                    };
                }
                
                await ndef.scan({ signal: abortController.signal }).then(() => {
                    console.log("Scan started successfully.");

                }).catch(error => {
                    console.log(`Error! Scan failed to start: ${error}.`);
                });
            }

            scanNFCTags();

        }else{
            setError("Sorry. But reading NFC cards are not supported on this device/browser.  Please use: Chrome, Opera, Samsung Internet or WebView on Android.")
        }


        return () => {
            abortController.abort();
        }

    }, [])


    return {
        results,
        error
    }
}