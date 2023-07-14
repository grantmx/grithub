import Style from "./Video.module.scss"
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useClock } from "../../custom_hooks/useClock";

const video = "https://player.vimeo.com/progressive_redirect/playback/845283960/rendition/1080p/file.mp4?loc=external&log_user=0&signature=6af30e4335756e51a79f0d585cbb801ee0a8193a202498fe6e97b4025987cc33"

function VideoAd(){
    const [ show, setShown ] = useState(false)
    const videoRef = useRef()
    const clock = useClock({ locale: "en-GB", timeZone: "CAT" });

    
    useMemo(() => {
        if( clock.raw.minutes % 15 === 0 && videoRef?.current ){
            setShown(true)
            videoRef.current.play()
        }

        if( videoRef?.current ){
            videoRef.current.addEventListener("ended", () => {
                videoRef.current.pause()
                setShown(false)
            })
        }

    }, [ clock.raw.minutes ])


    return(
        <video 
            controls={false} 
            muted
            ref={videoRef} 
            width="1024" 
            className={clsx(Style.block, show && Style.show)}
        >
            <source src={video} type="video/mp4" />
        </video>
    )
}

export default VideoAd;