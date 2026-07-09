import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ClientContext } from "../context/ClientContext";
import type { Client } from "../types/client";

const emptyClient = {
  name: "",
  phone: "",
  address: "",
  gateCode: "",
  pricePerCleaning: 0,
  startDate: "",
  estimatedHours: 0,
  frequency: "Weekly",
  notes: "",
} satisfies Omit<Client, "id" | "helperNeeded" | "active" | "firestoreId">;

function AddClient() {
  const [client, setClient] = useState(emptyClient);
  const clientContext = useContext(ClientContext);
  const navigate = useNavigate();

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { addClient } = clientContext;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setClient((prevClient) => ({
      ...prevClient,
      [name]: name === "pricePerCleaning" || name === "estimatedHours"
        ? Number(value)
        : value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await addClient({
      id: Date.now(),
      ...client,
      helperNeeded: false,
      active: true,
    });

    setClient(emptyClient);
    navigate("/clients");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--charcoal)]">
          Add Client
        </h1>

        <p className="mt-1 text-[var(--muted)]">
          Create a new cleaning client.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-lg border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow"
      >
        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Name
          </label>

          <input
            type="text"
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            name="name"
            value={client.name}
            onChange={handleChange}
            placeholder="John Smith"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Phone
          </label>

          <input
            type="tel"
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            name="phone"
            value={client.phone}
            onChange={handleChange}
            placeholder="801-555-1234"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Address
          </label>

          <input
            type="text"
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            name="address"
            value={client.address}
            onChange={handleChange}
            placeholder="123 Main St, Salt Lake City, UT"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Gate / Garage Code
          </label>

          <input
            type="text"
            name="gateCode"
            value={client.gateCode}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="1234"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Price Per Cleaning
          </label>

          <input
            type="number"
            name="pricePerCleaning"
            value={client.pricePerCleaning}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="$150"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Start Date
          </label>

          <input
            type="date"
            name="startDate"
            value={client.startDate}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Estimated Hours Per Cleaning
          </label>

          <input
            type="number"
            name="estimatedHours"
            value={client.estimatedHours}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="3"
            step="0.25"
          />
        </div>
        
        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Frequency
          </label>

          <select
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            name="frequency"
            value={client.frequency}
            onChange={handleChange}
          >
            <option>Weekly</option>
            <option>Twice Weekly</option>
            <option>Twice Monthly</option>
            <option>Monthly</option>
            <option>As Needed</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Notes
          </label>

          <textarea
            rows={4}
            name="notes"
            value={client.notes}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="Dogs, alarm instructions, special requests..."
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--olive-dark)] px-4 py-3 font-medium text-white transition hover:bg-[var(--olive)]"
        >
          Save Client
        </button>
      </form>
    </div>
  );
}

export default AddClient;