import React from 'react';

import  AuthUserContext  from './context';
import { firebaseService } from '.';

const withAuthentication = Component => {
    class WithAuthentication extends React.Component{
        constructor(props){
            super(props);
    
            this.state = {
                authUser: null
            };
        }
    
        componentDidMount(){
            this.listener = this.props.firebase.onAuthUserListener(
                authUser => {
                    localStorage.setItem('authUser', JSON.stringify(authUser));
                    this.setState({ authUser });
                
                },() => {
                    localStorage.removeItem('authUser');
                    this.setState({ authUser: null });
                },
            );
        }
    
    
        componentWillUnmount(){
            this.listener();
        }


        render(){
            return (
                <AuthUserContext.Provider value={this.state.authUser} >
                    <Component {...this.props} />
                </AuthUserContext.Provider>
            );
        }
    }

    return firebaseService(WithAuthentication);
}

export default withAuthentication;