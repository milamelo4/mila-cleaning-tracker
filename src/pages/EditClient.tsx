import { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClientContext } from "../context/ClientContext";

function EditClient() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const clientContext = useContext(ClientContext);

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { clients, updateClient } = clientContext;

  const selectedClient = clients.find(
    (client) => client.firestoreId === clientId
  );

  const [client, setClient] = useState(selectedClient);

  if (!client) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-6">
        <p className="text-[var(--muted-dark)]">Client not found.</p>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    let formattedValue: string | number = value;

    if (name === "phone") {
      const numbers = value.replace(/\D/g, "").slice(0, 10);

      if (numbers.length <= 3) {
        formattedValue = numbers;
      } else if (numbers.length <= 6) {
        formattedValue = `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
      } else {
        formattedValue = `(${numbers.slice(0, 3)}) ${numbers.slice(
          3,
          6
        )}-${numbers.slice(6)}`;
      }
    }

    if (name === "pricePerCleaning" || name === "estimatedHours") {
      formattedValue = Number(value);
    }

    setClient((prevClient) => {
      if (!prevClient) return prevClient;

      return {
        ...prevClient,
        [name]: formattedValue,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = client.name.trim();
    const address = client.address.trim();
    const gateCode = client.gateCode.trim();
    const notes = client.notes.trim();
    const phoneDigits = client.phone.replace(/\D/g, "");

    const validFrequencies = [
      "Weekly",
      "Twice Weekly",
      "Twice Monthly",
      "Monthly",
      "As Needed",
    ];

    if (name.length < 2 || name.length > 100) {
      alert("Client name must be between 2 and 100 characters.");
      return;
    }

    if (phoneDigits.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    if (address.length < 5 || address.length > 200) {
      alert("Please enter a valid address.");
      return;
    }

    if (gateCode.length > 50) {
      alert("Gate or garage code must be 50 characters or fewer.");
      return;
    }

    if (
      !Number.isFinite(client.pricePerCleaning) ||
      client.pricePerCleaning < 0.01 ||
      client.pricePerCleaning > 10000
    ) {
      alert("Price must be between $0.01 and $10,000.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(client.startDate)) {
      alert("Please enter a valid start date.");
      return;
    }

    if (
      !Number.isFinite(client.estimatedHours) ||
      client.estimatedHours < 0.25 ||
      client.estimatedHours > 24
    ) {
      alert("Estimated hours must be between 0.25 and 24.");
      return;
    }

    if (!validFrequencies.includes(client.frequency)) {
      alert("Please select a valid frequency.");
      return;
    }

    if (notes.length > 1000) {
      alert("Notes must be 1,000 characters or fewer.");
      return;
    }

    await updateClient({
      ...client,
      name,
      address,
      gateCode,
      notes,
    });

    navigate(`/clients/${client.firestoreId}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--charcoal)]">
          Edit Client
        </h1>

        <p className="mt-1 text-[var(--blue-dark)]">
          Update this client's information.
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
          name="name"
          value={client.name}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={100}
          className="w-full rounded-md border border-[var(--border-soft)] p-3"
         />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Phone
          </label>

          <input
          type="tel"
          name="phone"
          value={client.phone}
          onChange={handleChange}
          required
          inputMode="tel"
          maxLength={14}
          className="w-full rounded-md border border-[var(--border-soft)] p-3"
         />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Address
          </label>

          <input
          type="text"
          name="address"
          value={client.address}
          onChange={handleChange}
          required
          minLength={5}
          maxLength={200}
          className="w-full rounded-md border border-[var(--border-soft)] p-3"
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
          maxLength={50}
          className="w-full rounded-md border border-[var(--border-soft)] p-3"
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
          required
          min="0.01"
          max="10000"
          step="0.01"
          className="w-full rounded-md border border-[var(--border-soft)] p-3"
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
          required
          className="block w-0 min-w-full max-w-full appearance-none rounded-md border border-[var(--border-soft)] p-3"
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
          required
          min="0.25"
          max="24"
          step="0.25"
          className="w-full rounded-md border border-[var(--border-soft)] p-3"
         />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-medium text-[var(--charcoal)]">
            Frequency
          </label>

          <select
            name="frequency"
            value={client.frequency}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
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
            maxLength={1000}
            value={client.notes}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/clients/${client.firestoreId}`)}
            className="w-full rounded-md border border-[var(--border-soft)] px-4 py-3 font-medium text-[var(--charcoal)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-full rounded-md bg-[var(--blue-dark)] px-4 py-3 font-medium text-white transition hover:bg-[var(--blue)]"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditClient;