import clsx from 'clsx';
import Style from './Card.module.scss'


function Card({ 
    children, 
    className, 
    marginBottom = null,
    theme,
    noMargin = false, 
    element = null,
}){

    const Element = element === null ? "article" : element;

    return(
        <Element 
            className={clsx(
                Style.block, 
                className, 
                theme && Style[theme],
                noMargin && Style.noMargin
            )} 
            style={{ marginBottom: `${marginBottom ?? 0}rem` }}
        >
            {children}
        </Element>
    )
}

export default Card;