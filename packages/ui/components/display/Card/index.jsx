import clsx from 'clsx';
import Style from './Card.module.scss'


function Card({ 
    children, 
    className, 
    marginBottom = null,
    theme,
    noMargin = false, 
}){
    return(
        <article 
            className={clsx(
                Style.block, 
                className, 
                theme && Style[theme],
                noMargin && Style.noMargin
            )} 
            style={{ marginBottom: `${marginBottom}rem` }}
        >
            {children}
        </article>
    )
}

export default Card;