import { useContext, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";

import { db } from "../firebase";
import { MemberContext, type Member } from "../context/MemberContext";

function HelperPayRow({ helper }: { helper: Member }) {
  const [percentage, setPercentage] = useState(
    String(helper.payoutPercentage ?? 50),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    const rate = Number(percentage);

    if (
      percentage.trim() === "" ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 100
    ) {
      setMessage("Enter a percentage from 0 to 100.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(
        doc(db, "businesses", "mila-cleaning-tracker", "members", helper.uid),
        { payoutPercentage: rate },
      );

      setMessage("Saved successfully.");
    } catch {
      setMessage("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border p-4">
      <p className="mb-3 font-medium">{helper.email}</p>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          aria-label={`Pay percentage for ${helper.email}`}
          value={percentage}
          onChange={(event) => {
            setPercentage(event.target.value);
            setMessage("");
          }}
          className="w-24 rounded-lg border p-2"
        />

        <span>%</span>

        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-[var(--blue-dark)] px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

export default function HelperPaySettings() {
  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  if (memberContext.role !== "admin") {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Helper Pay Settings</h2>

      {memberContext.helpers.length === 0 ? (
        <p>No helpers found.</p>
      ) : (
        memberContext.helpers.map((helper) => (
          <HelperPayRow key={helper.uid} helper={helper} />
        ))
      )}
    </section>
  );
}
