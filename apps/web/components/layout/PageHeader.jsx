

function PageHeader({ title, subTitle }){
    return(
        <>
            <h1 className="display-1">
                {title}
            </h1>
            <p className="lead text-muted fs-3">
                {subTitle}
            </p>
        </>
    )
}

export default PageHeader;