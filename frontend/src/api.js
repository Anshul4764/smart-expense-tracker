
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

export const financeApi = axios.create({
  baseURL: `${API_BASE}/finance`,
});

export const portfolioApi = axios.create({
  baseURL: `${API_BASE}/portfolio`,
});
