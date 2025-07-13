import { createContext, useState } from "react";

// Create the context
// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    // You can add more user-related logic here

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};
