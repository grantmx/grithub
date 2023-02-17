import React from 'react';
import { compose } from 'recompose';

import  AuthUserContext  from './context';
import { firebaseService } from '.';

const withAuthorization = condition => Component => {
    class WithAuthorization extends React.Component{
        
        componentDidMount(){
            this.listener = this.props.firebase.auth.onAuthStateChanged(authUser => {
                if( !condition(authUser) ){
                    this.props.history.push("/signin");
                }

            }, () => this.props.history.push("/signin"))
        }


        componentWillUnmount(){
            this.listener();
        }


        render(){
            return (
                <AuthUserContext.Provider>
                    <Component {...this.props} />
                </AuthUserContext.Provider>
            );
        }
    }

    return compose(firebaseService)(WithAuthorization);
}

export default withAuthorization;