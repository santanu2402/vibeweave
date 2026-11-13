// Endpoints fixture: the calls endpoints.mjs should find.
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const listStudios = () => fetch("/api/studios").then((r) => r.json());

export const getStudio = (id: string) => fetch(`${API_URL}/studios/${id}`);

export async function createBooking(data: unknown) {
  return fetch("/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
}

export const cancelBooking = (bookingId: number) => axios.delete(`/api/bookings/${bookingId}`);

export const health = () => fetch("/api/health");
