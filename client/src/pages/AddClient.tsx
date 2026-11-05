import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ClientContext } from "../context/ClientContext";
import type { Client } from "../types/client";

type ClientFormState = Omit<
  Client,
  "id" | "helperNeeded" | "active" | "firestoreId"
>;

const emptyClient: ClientFormState = {
  name: "",
  phone: "",
  address: "",
  gateCode: "",

  billingType: "Per Cleaning",
  pricePerCleaning: 0,
  monthlyRate: 0,

  startDate: "",
  estimatedHours: 0,
  frequency: "Weekly",

  notes: "",
  pricingNotes: "",
  cleaningInstructions: "",

  assignedHelpers: [],
};

function AddClient() {
  const [client, setClient] = useState<ClientFormState>(emptyClient);

  const clientContext = useContext(ClientContext);

  const navigate = useNavigate();

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { addClient } = clientContext;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
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
          6,
        )}-${numbers.slice(6)}`;
      }
    }

    if (
      name === "pricePerCleaning" ||
      name === "monthlyRate" ||
      name === "estimatedHours"
    ) {
      formattedValue = Number(value);
    }

    setClient((previousClient) => ({
      ...previousClient,
      [name]: formattedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = client.name.trim();

    const address = client.address.trim();

    const gateCode = client.gateCode.trim();

    const notes = client.notes.trim();

    const pricingNotes = client.pricingNotes.trim();

    const cleaningInstructions = client.cleaningInstructions.trim();

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
      client.billingType !== "Per Cleaning" &&
      client.billingType !== "Fixed Monthly"
    ) {
      alert("Please select a valid billing type.");

      return;
    }

    if (client.billingType === "Per Cleaning") {
      if (
        !Number.isFinite(client.pricePerCleaning) ||
        client.pricePerCleaning < 0.01 ||
        client.pricePerCleaning > 10000
      ) {
        alert("Price per cleaning must be between $0.01 and $10,000.");

        return;
      }
    }

    if (client.billingType === "Fixed Monthly") {
      if (
        !Number.isFinite(client.monthlyRate) ||
        client.monthlyRate < 0.01 ||
        client.monthlyRate > 50000
      ) {
        alert("Monthly rate must be between $0.01 and $50,000.");

        return;
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(client.startDate)) {
      alert("Please enter a valid start date.");

      return;
    }

    if (
      !Number.isFinite(client.estimatedHours) ||
      client.estimatedHours < 0.5 ||
      client.estimatedHours > 24
    ) {
      alert("Estimated hours must be between 0.5 and 24.");

      return;
    }

    if (!validFrequencies.includes(client.frequency)) {
      alert("Please select a valid frequency.");

      return;
    }

    if (notes.length > 1000) {
      alert("Admin notes must be 1,000 characters or fewer.");

      return;
    }

    if (pricingNotes.length > 1000) {
      alert("Pricing notes must be 1,000 characters or fewer.");

      return;
    }

    if (cleaningInstructions.length > 1000) {
      alert("Cleaning instructions must be 1,000 characters or fewer.");

      return;
    }

    await addClient({
      id: Date.now(),

      ...client,

      name,
      address,
      gateCode,
      notes,
      pricingNotes,
      cleaningInstructions,

      pricePerCleaning: client.pricePerCleaning,

      monthlyRate:
        client.billingType === "Fixed Monthly" ? client.monthlyRate : 0,

      helperNeeded: false,

      assignedHelpers: client.assignedHelpers,

      active: true,
    });

    setClient(emptyClient);

    navigate("/clients");
  };

  return (
    <div>
      <div className="mx-auto w-full max-w-2xl">
        <button
          onClick={() => navigate("/clients")}
          className="mb-4 text-sm font-semibold text-[var(--blue-dark)] hover:underline"
        >
          ← Back to Clients
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--charcoal)]">
          Add Client
        </h1>

        <p className="mt-1 text-[var(--blue-dark)]">
          Create a new cleaning client.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-lg border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow"
      >
        <div className="mb-4">
          <label
            htmlFor="name"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Name
          </label>

          <input
            type="text"
            id="name"
            name="name"
            value={client.name}
            onChange={handleChange}
            placeholder="John Smith"
            required
            minLength={2}
            maxLength={100}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="phone"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Phone
          </label>

          <input
            type="tel"
            id="phone"
            name="phone"
            value={client.phone}
            onChange={handleChange}
            placeholder="(801) 555-1234"
            required
            inputMode="tel"
            maxLength={14}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="address"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Address
          </label>

          <input
            type="text"
            id="address"
            name="address"
            value={client.address}
            onChange={handleChange}
            placeholder="123 Main St, Salt Lake City, UT"
            required
            minLength={5}
            maxLength={200}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="gateCode"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Gate / Garage Code
          </label>

          <input
            type="text"
            id="gateCode"
            name="gateCode"
            value={client.gateCode}
            onChange={handleChange}
            placeholder="1234"
            maxLength={50}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="billingType"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Billing Type
          </label>

          <select
            id="billingType"
            name="billingType"
            value={client.billingType}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          >
            <option value="Per Cleaning">Per Cleaning</option>

            <option value="Fixed Monthly">Fixed Monthly</option>
          </select>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Fixed Monthly means the client pays the same amount each month, even
            when the calendar has an extra cleaning week.
          </p>
        </div>

        {client.billingType === "Per Cleaning" ? (
          <div className="mb-4">
            <label
              htmlFor="pricePerCleaning"
              className="mb-2 block font-medium text-[var(--charcoal)]"
            >
              Price Per Cleaning
            </label>

            <input
              type="number"
              id="pricePerCleaning"
              name="pricePerCleaning"
              value={client.pricePerCleaning}
              onChange={handleChange}
              onWheel={(event) => event.currentTarget.blur()}
              placeholder="150"
              required
              min="0.01"
              max="10000"
              step="0.01"
              className="w-full rounded-md border border-[var(--border-soft)] p-3"
            />
          </div>
        ) : (
          <div className="mb-4">
            <label
              htmlFor="monthlyRate"
              className="mb-2 block font-medium text-[var(--charcoal)]"
            >
              Monthly Rate
            </label>

            <input
              type="number"
              id="monthlyRate"
              name="monthlyRate"
              value={client.monthlyRate}
              onChange={handleChange}
              onWheel={(event) => event.currentTarget.blur()}
              placeholder="1000"
              required
              min="0.01"
              max="50000"
              step="0.01"
              className="w-full rounded-md border border-[var(--border-soft)] p-3"
            />
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="startDate"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Start Date
          </label>

          <input
            type="date"
            id="startDate"
            name="startDate"
            value={client.startDate}
            onChange={handleChange}
            required
            className="block w-0 min-w-full max-w-full appearance-none rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="estimatedHours"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Estimated Hours Per Cleaning
          </label>

          <input
            type="number"
            id="estimatedHours"
            name="estimatedHours"
            value={client.estimatedHours}
            onChange={handleChange}
            onWheel={(event) => event.currentTarget.blur()}
            placeholder="3"
            required
            min="0.5"
            max="24"
            step="0.25"
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="frequency"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Frequency
          </label>

          <select
            id="frequency"
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

        <div className="mb-4">
          <label
            htmlFor="notes"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Admin Notes
          </label>

          <p className="mb-2 text-sm text-[var(--muted)]">
            Private. Helpers will not see these notes.
          </p>

          <textarea
            id="notes"
            rows={4}
            name="notes"
            value={client.notes}
            maxLength={1000}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="Private client or business notes..."
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="pricingNotes"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Pricing Notes
          </label>

          <p className="mb-2 text-sm text-[var(--muted)]">
            Private. Use this for raises and pricing history.
          </p>

          <textarea
            id="pricingNotes"
            rows={3}
            name="pricingNotes"
            value={client.pricingNotes}
            maxLength={1000}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="Raised from $35 to $40 — July 2026"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="cleaningInstructions"
            className="mb-2 block font-medium text-[var(--charcoal)]"
          >
            Cleaning Instructions
          </label>

          <p className="mb-2 text-sm text-[var(--muted)]">
            Helpers assigned to a cleaning can see this information.
          </p>

          <textarea
            id="cleaningInstructions"
            rows={4}
            name="cleaningInstructions"
            value={client.cleaningInstructions}
            maxLength={1000}
            onChange={handleChange}
            className="w-full rounded-md border border-[var(--border-soft)] p-3"
            placeholder="Dogs, alarm instructions, rooms to skip, special cleaning requests..."
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-[var(--blue-dark)] px-4 py-3 font-medium text-white transition hover:bg-[var(--blue)]"
        >
          Save Client
        </button>
      </form>
    </div>
  );
}

export default AddClient;
