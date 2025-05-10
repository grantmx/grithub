
const style = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    textAlign: 'center'
}

function NotFound(){
    return(
        <div style={style}>
            <h1>Not Found</h1>
            <p>Could not find requested resource</p>
        </div>
    )
}

export default NotFound;