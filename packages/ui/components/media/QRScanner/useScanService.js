import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Quagga from '@ericblade/quagga2';
import QrCodeReader from '@ericblade/quagga2-reader-qr';
import adapter from 'webrtc-adapter';
import useDebounce from 'react-use/lib/useDebounce';

Quagga.registerReader('qrcode', QrCodeReader);


const useScanService = ({
        onDetected,
        scannerRef,
        onScannerReady,
        cameraId,
        facingMode,
        numOfWorkers = 0,
        locate = true,
    }) => {
        const [ result, setResult ] = useState(null);

        const [ _, cancel ] = useDebounce(() => {
            if( result?.codeResult?.code ){
                onDetected(result)
            }
    
        }, 500, [result])



        function handleProcessed(result){
            if( result?.codeResult?.code ){
                setResult(result);
            }
        }


        useEffect(() => {
            Quagga.init({
                inputStream: {
                    type: 'LiveStream',
                    constraints: {
                        width: 640,
                        height: 480,
                        ...(cameraId && { deviceId: cameraId }),
                        ...(!cameraId && { facingMode }),
                    },
                    area: {
                        top: "0%",    
                        right: "0%",  
                        left: "0%",  
                        bottom: "0%"
                    },
                    target: scannerRef.current,
                },
                frequency: 10,
                numOfWorkers: navigator.hardwareConcurrency || 0,
                decoder: {
                    readers: ['qrcode']
                },
                multiple: false

            }, (err) => {
                Quagga.onProcessed(handleProcessed);

                if (err) {
                    return console.log('Error starting Quagga:', err);
                }

                if (scannerRef && scannerRef.current) {
                    Quagga.start();

                    if (onScannerReady) {
                        onScannerReady();
                    }
                }
            });

            // Quagga.onDetected(errorCheck);

            return () => {
                // Quagga.offDetected(errorCheck);
                Quagga.offProcessed(handleProcessed);
                Quagga.stop();
            };

        }, [ scannerRef ]);


    return null;
}


useScanService.propTypes = {
    onDetected: PropTypes.func.isRequired,
    scannerRef: PropTypes.object.isRequired,
    onScannerReady: PropTypes.func,
    cameraId: PropTypes.string,
    facingMode: PropTypes.string,
    numOfWorkers: PropTypes.number,
    locate: PropTypes.bool,
};

export default useScanService;