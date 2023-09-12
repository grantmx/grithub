import { useRef } from 'react';
import Style from "./QRScanner.module.scss"
import clsx from 'clsx';
import useScanService from './useScanService';



function QRScanner({ onSuccess }){
    const scannerRef = useRef(null);

    useScanService({
        scannerRef,
        onDetected: (result) => onSuccess(result)
    })

    return(
        <div className={Style.scanner} ref={scannerRef}>
            <canvas className={clsx("drawingBuffer", Style.buffer)} />
        </div>
    );
    
}

export default QRScanner;