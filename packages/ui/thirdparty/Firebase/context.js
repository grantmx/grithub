/* eslint-disable react/display-name */
import React from 'react';

const FirebaseContext = React.createContext({});
FirebaseContext.displayName = 'FirebaseContext';

// creates higher order component to make this more of a service
export const firebaseService = Component => props => (
    <FirebaseContext.Consumer>
        {firebase => (
            <Component {...props} firebase={firebase} />
        )}
    </FirebaseContext.Consumer>
)

export default FirebaseContext;