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

    setClient((prevClient) => {
      if (!prevClient) return prevClient;

      return {
        ...prevClient,
        [name]:
          name === "pricePerCleaning" || name === "estimatedHours"
            ? Number(value)
            : value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await updateClient(client);
    navigate(`/clients/${client.firestoreId}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--charcoal)]">
          Edit Client
        </h1>

        <p className="mt-1 text-[var(--blue-dark)]">
          Update this client’s information.
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