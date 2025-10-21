// src/axiosConfig.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5000", // 👈 Your backend URL
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // only if you are using cookies/session
});

export default axiosInstance;
