import Modal from "ui/components/feedback/Modal"
import Button from "ui/components/form/Button"
import Style from "./styles/Handheld.module.scss"
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { redirect } from 'next/navigation'
import clsx from "clsx"

function TimeoutModal({ onClear }){

    return(
        <Modal size="sm" shouldOpen={true} useHeader={false} willClose={() => null}>
            <div className={Style.counterCntr}>
                <CountdownCircleTimer
                    isPlaying
                    duration={30}
                    colors={['#004777', '#F7B801', '#A30000', '#A30000']}
                    colorsTime={[30, 20, 10, 0]}
                    strokeWidth={25}
                    strokeLinecap="butt"
                    onComplete={() => {
                        redirect("/handheld")
                    }}
                >
                    {({ remainingTime }) => remainingTime}
                </CountdownCircleTimer>
            </div>

            <article className={clsx(Style.modalBlock, Style.modalTopIcon)}>
                <h1 className={Style.modalHeading}>
                    Are you still there?
                </h1>

                <Button color="green" onClick={onClear}>
                    <strong>YES</strong>
                </Button>
            </article>
        </Modal>
    )
}


export default TimeoutModal;