import Grid from 'components/layout/Grid';
import GridColumn from 'components/layout/GridColumn';
import React from 'react';
import clsx from 'clsx';

import utils from 'styles/globals/utils.module.scss';


class ErrorBoundary extends React.Component{
    constructor(props){
        super(props)

        this.state = {
            hasError: false
        }
    }

    static getDerivedStateFromError(error){        
        return { hasError: true };
    }


    componentDidCatch(error, errorInfo){
        console.log(error)
        console.log(errorInfo)
    }


    render(){
        if( this.state.hasError ){
            return(
                <Grid>
                    <GridColumn start={2} end={10} className={clsx(utils.text_center, utils.py_2)}>
                        <small className={clsx(utils.mt_4)}>
                            <strong>Sorry. Something went wrong.</strong>
                        </small>

                        <small> Our team has been notified and will address it immediately.</small>

                        {this.state.error && (
                            <small>{this.state.error} - {this.state.errorInfo}</small>
                        )}
                    </GridColumn>
                </Grid>
            )
        }

        return this.props.children;
    }
}


export default ErrorBoundary;