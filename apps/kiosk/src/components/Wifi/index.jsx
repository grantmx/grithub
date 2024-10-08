import { hubs } from '../../lib/constants';
import Style from './Wifi.module.scss'

function Wifi(){
    return(
        <section className={Style.block}>
            <svg viewBox="0 0 24 24" className={Style.icon}>
                <path d="M5.016 12.984c3.891-3.844 10.125-3.844 13.969 0l-1.969 2.016c-2.766-2.766-7.266-2.766-10.031 0zM9 17.016c1.641-1.641 4.359-1.641 6 0l-3 3zM0.984 9c6.094-6.047 15.984-6.047 22.031 0l-2.016 2.016c-4.969-4.969-13.031-4.969-18 0z"></path>
            </svg>

            <p className={Style.text}>
                <span className={Style.desc}>
                    Free WiFi
                </span>
                <span className={Style.ssid}>
                    {hubs.george.wifi}
                </span>
                <span className={Style.password}>
                    {hubs.george.wifiPassword}
                </span>
            </p>

        </section>
    )
}

export default Wifi;