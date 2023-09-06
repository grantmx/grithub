import Style from "./CardHeader.module.scss"


function CardHeader({ title, subTitle, toolbar }){
    return(
        <header className={Style.block}>
            <div className={Style.titleBlock}>
                <h3 className={Style.title}>
                    {title}
                </h3>

                {subTitle && (
                    <h4 className={Style.subTitle}>
                        {subTitle}
                    </h4>
                )}
            </div>

            {toolbar && (
                <div className={Style.toolbar}>
                    {toolbar}
                </div>
            )}
        </header>
    )
}


export default CardHeader;