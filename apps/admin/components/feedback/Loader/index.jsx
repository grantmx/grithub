import Style from './Loader.module.scss';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { IconSpinner } from 'components/icons';
import { useEffect, useState } from 'react';


function Loader({ 
    isLoading = false, 
    isSuccessful = false, 
    hasError = false, 
    isLarge = false, 
    children = null,
    isGreenCheck = false,
    isDark = false
}){
    const [ success, setSuccess ] = useState(false)
    const [ error, setError ] = useState(false)
    const [ loading, setLoading ] = useState(false)


    useEffect(() => {
        setLoading(isLoading)

        if( isSuccessful || hasError ){
            setLoading(false)

            setSuccess(isSuccessful)
            setError(hasError)

            setTimeout(() => {
                setSuccess(false)
                setError(false)
            }, 2000)
        }

        
        return () => {
            setLoading(false)
            setSuccess(false)
            setError(false)
        }

    }, [isSuccessful, hasError, isLoading])


    return(
        <>
            {success || error || loading ?
                <div className={Style.block} role="progressbar">
                    {success && <div className={clsx(Style.checkmark, Style.complete, Style.draw, isGreenCheck && Style.greenCheckmark)} />}
                    {error && <div className={clsx(Style.error)} />}

                    {loading && (
                        <IconSpinner 
                            className={clsx("icon-spinner", Style.spinner, isLarge && Style.largeSpinner)} 
                            isDark={isDark}
                        />
                    )}
                </div>
            :
                children
            }
        </>
    )
}


Loader.propTypes = {
    isLoading: PropTypes.bool,
    isSuccessful: PropTypes.bool,
    hasError: PropTypes.bool,
    isLarge: PropTypes.bool
}

export default Loader;