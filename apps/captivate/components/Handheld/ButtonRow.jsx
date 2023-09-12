import Link from "next/link";
import Style from "./styles/Handheld.module.scss"
import clsx from "clsx";


function ButtonRow({ back, next, current = 0 }){
    return(
        <div className={Style.buttonRow}>
            {back ? (
                <Link 
                    href={{ href: "handheld", query: { goto: back, current }}} 
                    role="button" 
                    className={clsx(Style.transButton, !back && Style.transButton__disabled)}
                >
                    <svg id="icon-arrow-left-circle" viewBox="0 0 24 24" width="50" height="50" fill="#fff">
                        <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                        <path d="M16 11h-5.6l2.3-2.3c0.4-0.4 0.4-1 0-1.4s-1-0.4-1.4 0l-4 4c-0.1 0.1-0.2 0.2-0.2 0.3-0.1 0.2-0.1 0.5 0 0.8 0.1 0.1 0.1 0.2 0.2 0.3l4 4c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4l-2.3-2.3h5.6c0.6 0 1-0.4 1-1s-0.4-1-1-1z"></path>
                    </svg>
                    &nbsp; Back
                </Link>
            ):(
                <div className={clsx(Style.transButton, !back && Style.transButton__disabled)}>
                    <svg id="icon-arrow-left-circle" viewBox="0 0 24 24" width="50" height="50" fill="#fff">
                        <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                        <path d="M16 11h-5.6l2.3-2.3c0.4-0.4 0.4-1 0-1.4s-1-0.4-1.4 0l-4 4c-0.1 0.1-0.2 0.2-0.2 0.3-0.1 0.2-0.1 0.5 0 0.8 0.1 0.1 0.1 0.2 0.2 0.3l4 4c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4l-2.3-2.3h5.6c0.6 0 1-0.4 1-1s-0.4-1-1-1z"></path>
                    </svg>
                    &nbsp; Back
                </div>
            )}
            


            <Link  href={{ href: "handheld", query: { goto: 1 }}} role="button" className={Style.transButton}>
                <svg id="icon-home" viewBox="0 0 24 24" width="40" height="40" fill="#fff">
                    <path d="M9.984 20.016h-4.969v-8.016h-3l9.984-9 9.984 9h-3v8.016h-4.969v-6h-4.031v6z"></path>
                </svg>
            </Link>

            
            {next ? (
                <Link 
                    href={{ href: "handheld", query: { goto: next, current }}} 
                    role="button" 
                    disabled={true}
                    className={clsx(Style.transButton, !next && Style.transButton__disabled)}
                >
                    Next &nbsp;
                    <svg id="icon-arrow-right-circle" viewBox="0 0 24 24" width="50" height="50" fill="#fff">
                        <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                        <path d="M16.9 11.6c-0.1-0.1-0.1-0.2-0.2-0.3l-4-4c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4l2.3 2.3h-5.6c-0.6 0-1 0.4-1 1s0.4 1 1 1h5.6l-2.3 2.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3l4-4c0.1-0.1 0.2-0.2 0.2-0.3 0.1-0.3 0.1-0.5 0-0.8z"></path>
                    </svg>
                </Link>
            ):(
                <div className={clsx(Style.transButton, Style.transButton__disabled)}>
                    Next &nbsp;
                    <svg id="icon-arrow-right-circle" viewBox="0 0 24 24" width="50" height="50" fill="#fff">
                        <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                        <path d="M16.9 11.6c-0.1-0.1-0.1-0.2-0.2-0.3l-4-4c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4l2.3 2.3h-5.6c-0.6 0-1 0.4-1 1s0.4 1 1 1h5.6l-2.3 2.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3l4-4c0.1-0.1 0.2-0.2 0.2-0.3 0.1-0.3 0.1-0.5 0-0.8z"></path>
                    </svg>
                </div>
            )}
            
        </div>
    )
}


export default ButtonRow;