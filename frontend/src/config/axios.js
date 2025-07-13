import axios from "axios";

const axiosInstance = axios.create({

  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // ✅ send cookies with every request automatically
  //! This will automatically include the token in the headers of every request for protected routes
  //! Make sure to set the token in localStorage after user login
  // headers: {
  //   Authorization: `Bearer ${localStorage.getItem('token')}`, 
  // },
});

export default axiosInstance;
