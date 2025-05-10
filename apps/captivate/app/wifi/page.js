import QRCode from "react-qr-code";


function Wifi(){
    return(
        <div style={{ height: "auto", margin: "0 auto", maxWidth: 600, width: "100%" }}>
            <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={`WIFI:S:grantmx;T:WPA;P:kah6kar7fl;;`}
                viewBox={`0 0 256 256`}
            />
        </div>
    )
}

export default Wifi