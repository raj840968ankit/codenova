import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/user.context";
import axios from '../config/axios.js'

export const UserAuth = ({ children }) => {
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line no-unused-vars
    const { user, setUser } = useContext(UserContext);
    // const token = localStorage.getItem('token'); // Assuming you store the token in localStorage
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get("/users/profile");
                setUser(res.data.user); // ✅ Set user from backend
            } catch (err) {
                console.log("Auth error : ", err);
                
                setUser(null);         // ❌ Not authenticated
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) return (
        <div>Loading...</div>
    );

    return (
        <>
            {children}
        </>
    );
}