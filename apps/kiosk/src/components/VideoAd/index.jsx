import Style from "./Video.module.scss"
import Video from "../../assets/kisok-video-ad.mp4"
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useClock } from "../../custom_hooks/useClock";


function VideoAd(){
    const [ show, setShown ] = useState(false)
    const videoRef = useRef()
    const clock = useClock();

    
    useMemo(() => {
        if( clock.raw.minutes % 20 === 0 && videoRef?.current ){
            setShown(true)
            videoRef.current.play()
        }

        if( videoRef?.current ){
            videoRef.current.addEventListener("ended", () => {
                videoRef.current.pause()
                setShown(false)
            })
        }

    }, [ clock.raw.minutes, videoRef?.current ])


    return(
        <video 
            controls={false} 
            muted
            ref={videoRef} 
            width="1024" 
            className={clsx(Style.block, show && Style.show)}
        >
            <source src={Video} type="video/mp4" />
        </video>
    )
}

export default VideoAd;