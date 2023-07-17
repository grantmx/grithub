/**
*   Stepper State Manager:
*/

export const InitialState = {
    current: null,
    name: "",
    data: {}
}
 
 
 export const StepperReducer = ((state, action) => {
    switch(action.type){
        case "setName": 
            return{
                ...state,
                name: action.data
            }

        case "setData": 
            return{
                ...state,
                data: {
                    ...state.data,
                    ...action.data
                }
            }
            
        default: return;
    }
 })