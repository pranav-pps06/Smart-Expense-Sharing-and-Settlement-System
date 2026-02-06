import React, { useState } from "react";
import axios from "axios";

const AddGroupForm = ({ onGroupAdded }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addedMembers, setAddedMembers] = useState([]); // array of {id, username, email}
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const checkAndAddMember = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setMessage({ type: "error", text: "Enter an email to check." });
      return;
    }
    if (addedMembers.some((m) => m.email.toLowerCase() === trimmed)) {
      setMessage({ type: "error", text: "User already added." });
      return;
    }
    setChecking(true);
    setMessage(null);
    try {
      const res = await axios.get(`/api/users/lookup`, {
        params: { email: trimmed },
        withCredentials: true,
      });
      if (res.data?.user?.id) {
        setAddedMembers((prev) => [res.data.user, ...prev]); // added user goes on top
        setEmail("");
        setMessage({ type: "success", text: `Added ${res.data.user.username}` });
      } else {
        setMessage({ type: "error", text: "User not found." });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "User not found.",
      });
    } finally {
      setChecking(false);
    }
  };

  const removeMember = (id) => {
    setAddedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "Group name is required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
  const res = await axios.post(
    "/api/groups",
    {
      name: name.trim(),
      memberIds: addedMembers.map((m) => m.id),
    },
    { withCredentials: true }
  );

  setMessage({
    type: "success",
    text: `Group "${res.data?.group?.name || name}" created.`,
  });

  // 🔥 Refresh groups in dashboard
  if (onGroupAdded) onGroupAdded();

  // Reset for next creation
  setName("");
  setAddedMembers([]);
  setEmail("");

} catch (err) {
  setMessage({
    type: "error",
    text: err.response?.data?.message || "Failed to create group.",
  });
} finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-black p-6 shadow rounded max-w-md space-y-4">
      {message && (
        <div
          className={`p-2 rounded border ${
            message.type === "success"
              ? "text-[#C8FF01] border-[#C8FF01]"
              : "text-red-400 border-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Added members list at the top */}
      <div className="space-y-2">
        <p className="text-gray-200">Added Members</p>
        {addedMembers.length === 0 ? (
          <p className="text-gray-500 text-sm">No members added yet.</p>
        ) : (
          <ul className="space-y-2">
            {addedMembers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between bg-[#212121] text-white border border-gray-700 rounded px-3 py-2"
              >
                <span>
                  {m.username} <span className="text-gray-400">({m.email})</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeMember(m.id)}
                  className="text-red-400 hover:text-red-300"
                  title="Remove"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Group name */}
      <label className="block text-gray-200">
        Group Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full px-3 py-2 rounded bg-[#212121] text-white border border-gray-700 focus:outline-none focus:border-[#C8FF01]"
          placeholder="e.g., Trip to Goa"
        />
      </label>

      {/* Email input below and check button on the right */}
      <div>
        <p className="text-gray-200 mb-2">Add Member by Email</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-[#212121] text-white border border-gray-700 focus:outline-none focus:border-[#C8FF01]"
            placeholder="user@example.com"
          />
          <button
            type="button"
            onClick={checkAndAddMember}
            disabled={checking}
            className="bg-transparent border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black transition px-3 py-2 rounded disabled:opacity-60"
            title="Check & Add"
          >
            {checking ? "Checking…" : "Check & Add"}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-transparent border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black transition px-3 py-2 rounded disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create Group"}
      </button>
    </form>
  );
};

export default AddGroupForm;