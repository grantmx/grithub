import PropTypes from "prop-types";
import Breadcrumb from './Breadcrumb.tsx';
import clsx from "clsx";
import { usePathname } from 'next/navigation';

import Style from './Breadcrumb.module.scss';
import ErrorBoundary from "services/ErrorBoundary.js";


function Breadcrumbs({ 
    urlPath, 
    gridStart = 2, 
    gridEnd = 10, 
    className,
    rootClassName,
    listClassName,
    customPlacement = false
}) {
    const pathname = usePathname();
    console.log(pathname)
    return(
        <ErrorBoundary>
            {!pathname.includes("dashboard") && (
                <Breadcrumb 
                    customPath={urlPath}
                    containerClassName={clsx(Style.block, className)}
                    listClassName={clsx(Style.list, listClassName)}
                    inactiveItemClassName={Style.item}
                    activeItemClassName={Style.active}
                    rootLabel="Home"
                    linkClassName={Style.link}
                />
            )}
        </ErrorBoundary>  
    )
}


Breadcrumbs.propTypes = {
    urlPath: PropTypes.string,
    gridEnd: PropTypes.number,
    gridStart: PropTypes.number,
    className: PropTypes.string
}


export default Breadcrumbs;