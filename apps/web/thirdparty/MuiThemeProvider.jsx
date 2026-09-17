"use client"

import { ThemeProvider } from "@mui/material/styles";
import muiTheme from "@/lib/muiTheme";

// createTheme() returns functions (darken/lighten/etc.) which can't cross the server -> client
// props boundary, so the theme has to be constructed inside a client component, not passed into one
export default function MuiThemeProvider({ children }){
    return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
}
