import ReactModal from 'react-modal';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { IconClose } from 'ui/components/icons';

import Style from './Modal.module.scss';

function Modal({
    shouldOpen,
    willClose,
    heading,
    size,
    closeText,
    children,
    className,
    isATC,
    customCloseIcon,
    dismissible = true,
    useHeader = true
}) {
    const [modalOpen, setModalOpen] = useState(shouldOpen);

    useEffect(() => {
        setModalOpen(shouldOpen)

    }, [shouldOpen])


    const shouldClose = () => {
        if (willClose && dismissible) {
            willClose()
        }
    }


    return (
        <ReactModal
            role={"dialog"}
            aria={{ labelledby: `${heading}` }}
            isOpen={modalOpen}
            styles={Style}
            onRequestClose={() => {
                if( dismissible ){
                    setModalOpen(!modalOpen)
                }
            }}
            overlayClassName={Style.underlay}
            className={clsx(
                Style.body, 
                size && Style[`body_${size}`], 
                className,
                !dismissible && Style.padTop
            )}
            ariaHideApp={false}
            onAfterClose={shouldClose}
        >
            {useHeader && (
                <header className={clsx(heading && Style.heading)}>
                    {heading &&
                        <h2 className={Style.header}>
                            {isATC && (
                                <IconDone width="50" height="50" className={Style.iconDone} />
                            )}
                            {heading}
                        </h2>
                    }

                    {dismissible && (
                        <button type="button" onClick={() => setModalOpen(!modalOpen)} className={Style.closeBtn}>
                            {closeText ?
                                <>
                                    {closeText}
                                    {customCloseIcon && (
                                        <IconChevronLeft width="30" height="30" className={Style.customCloseIcon} />
                                    )}
                                </>

                                :
                                <>
                                    <IconClose width="30" height="30" /> Close
                                </>
                            }
                        </button>
                    )}
                    
                </header>
            )}

            {children}
        </ReactModal>
    )
}


Modal.propTypes = {
    shouldOpen: PropTypes.bool,
    heading: PropTypes.string,
    size: PropTypes.oneOf(["sm", "md", "lg"]),
    willClose: PropTypes.func.isRequired,
    closeText: PropTypes.string,
    isATC: PropTypes.bool,
    className: PropTypes.string,
    customCloseIcon: PropTypes.bool
};


export default Modal;