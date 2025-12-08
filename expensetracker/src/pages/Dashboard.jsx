import React, { useState, useEffect } from "react";
import GroupTile from "../components/GroupTile";
import { FiUser } from "react-icons/fi";
import axios from "axios";
import { socket } from "../lib/socket";
import { useAuth } from "../lib/auth";
import AddGroupForm from "../components/AddGroupForm";
import GroupChat from "../components/GroupChat";

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState("groups");
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user and initial groups
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/user-dashboard", {
         withCredentials: true 
        });
        setUser(res.data.user);
        const initialGroups = res.data.groups || [];
        setGroups(initialGroups);
        const ids = initialGroups.map((g) => g.id);
        if (ids.length) socket.emit('join:groups', ids);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeMenu !== "groups") return; // only when Groups tab is active
    const fetchGroups = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/groups", {
          withCredentials: true,
        });
        const list = res.data.groups || [];
        setGroups(list);
        const ids = list.map((g) => g.id);
        if (ids.length) socket.emit('join:groups', ids);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    fetchGroups();
  }, [activeMenu]);

  // Global realtime: refresh groups list when a new group is created
  useEffect(() => {
    const onGroupCreated = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/groups", { withCredentials: true });
        const list = res.data.groups || [];
        setGroups(list);
        const ids = list.map((g) => g.id);
        if (ids.length) socket.emit('join:groups', ids);
      } catch (e) {
        console.error('Failed to refresh groups after GROUP_CREATED', e);
      }
    };
    socket.on('GROUP_CREATED', onGroupCreated);
    return () => socket.off('GROUP_CREATED', onGroupCreated);
  }, []);

  // Load recent activities from Mongo when Activities tab active
  useEffect(() => {
    if (activeMenu !== "activities") return;
    (async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/recent-activities", {
          withCredentials: true,
          params: { limit: 50 },
        });
        setActivities(res.data.activities || []);
      } catch (e) {
        console.error("Failed to load recent activities", e);
        setActivities([]);
      }
    })();
    // Realtime: listen for events where current user is actor
    const onExpenseAdded = (evt) => {
      if (!user) return;
      const isActor = evt?.payerId === user.id;
      const isParticipant = Array.isArray(evt?.participantIds) && evt.participantIds.includes(user.id);
      if (!isActor && !isParticipant) return; // only show if user involved
      setActivities((prev) => [
        {
          _id: `${evt.expenseId}-recent-rt`,
          group_id: evt.groupId,
          user_id: evt.payerId,
          action_type: 'EXPENSE_ADDED',
          expense_id: evt.expenseId,
          meta: { amount: evt.amount, description: evt.description, participants: evt.participantIds || [] },
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    };
    const onGroupCreated = (evt) => {
      if (!user) return;
      if (evt?.createdBy !== user.id) return;
      setActivities((prev) => [
        {
          _id: `${evt.groupId}-group-rt`,
          group_id: evt.groupId,
          user_id: evt.createdBy,
          action_type: 'GROUP_CREATED',
          meta: { name: evt.name },
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    };
    socket.on('EXPENSE_ADDED', onExpenseAdded);
    socket.on('GROUP_CREATED', onGroupCreated);
    return () => {
      socket.off('EXPENSE_ADDED', onExpenseAdded);
      socket.off('GROUP_CREATED', onGroupCreated);
    };
  }, [activeMenu]);

  // Fetch members when a group is selected
  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedGroup) return;
      try {
        const res = await axios.get(
          `http://localhost:3000/api/groups/${selectedGroup.id}/members`,
          { withCredentials: true }
        );
        setGroupMembers(res.data.members || []);
      } catch (err) {
        console.warn("Members endpoint not available or failed:", err?.response?.status || err);
        setGroupMembers([]);
      }
    };
    fetchMembers();
  }, [selectedGroup]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#C8FF01] text-xl">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-900">

      {/* LEFT SIDEBAR */}
      <div className="w-60 bg-black text-white p-6 flex flex-col justify-between">

        <div>
          <img src="/company-logo.png" alt="Logo" className="w-40 mx-auto mb-6" />

          {user && (
            <h2 className="text-xl font-semibold text-center text-[#C8FF01]">
              Welcome, {user.username}
            </h2>
          )}

          <div className="mt-10 space-y-4">
            <p
              className={`cursor-pointer px-3 py-2 rounded-lg ${
                activeMenu === "groups" ? "bg-[#C8FF01] text-black" : "hover:bg-white/10"
              }`}
              onClick={() => setActiveMenu("groups")}
            >
              Groups
            </p>

            <p
              className={`cursor-pointer px-3 py-2 rounded-lg ${
                activeMenu === "activities" ? "bg-[#C8FF01] text-black" : "hover:bg-white/10"
              }`}
              onClick={() => setActiveMenu("activities")}
            >
              Recent Activities
            </p>

            <p
              className={`cursor-pointer px-3 py-2 rounded-lg ${
                activeMenu === "addgroup" ? "bg-[#C8FF01] text-black" : "hover:bg-white/10"
              }`}
              onClick={() => setActiveMenu("addgroup")}
            >
              Add Group
            </p>
          </div>
        </div>

      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 p-8 relative bg-[#212121] text-white">

        {/* USER ICON */}
        {user && (
          <div className="absolute top-6 right-6">
            <div className="group relative inline-block">
              <FiUser className="text-3xl cursor-pointer text-[#C8FF01]" />

              <div className="opacity-0 group-hover:opacity-100 transition bg-[#212121] border border-gray-500 shadow-lg p-4 rounded-lg absolute right-0 w-56 mt-2 text-white">
                <p className="font-semibold">{user.username}</p>
                <p className="text-sm text-gray-200">{user.email}</p>
                <button
                  onClick={logout}
                  className="mt-3 w-full bg-transparent border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black transition px-3 py-2 rounded"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT BASED ON ACTIVE MENU */}
        {activeMenu === "groups" && !selectedGroup && (
          <div>
            <h1 className="text-2xl font-bold mb-4 text-[#C8FF01]">Your Groups</h1>
            <div className="grid grid-cols-2 gap-4">
              {groups.map((g) => (
                <GroupTile
                  key={g.id}
                  name={g.name}
                  createdBy={g.created_by_name || "Unknown"}
                  onClick={() => setSelectedGroup(g)}
                />
              ))}
            </div>
          </div>
        )}

        {activeMenu === "groups" && selectedGroup && (
          <GroupChat
            group={selectedGroup}
            members={groupMembers}
            currentUser={user}
            onBack={() => setSelectedGroup(null)}
            onAddExpense={(group, payload) => {
              (async () => {
                try {
                  const res = await axios.post(
                    "http://localhost:3000/api/expenses",
                    {
                      groupId: group.id,
                      total: payload.total,
                      participantIds: payload.participantIds,
                      description: payload.description,
                    },
                    { withCredentials: true }
                  );
                  console.log("Expense created:", res.data);
                  // Optional: prepend a simple activity line
                  setActivities((prev) => [
                    `Added expense ₹${payload.total} in ${group.name}`,
                    ...prev,
                  ]);
                } catch (err) {
                  console.error("Failed to add expense", err);
                  alert(
                    err?.response?.data?.message || "Failed to add expense. Please try again."
                  );
                }
              })();
            }}
          />
        )}

        {activeMenu === "activities" && (
          <div>
            <h1 className="text-2xl font-bold mb-4 text-[#C8FF01]">Recent Activities</h1>
            <div className="space-y-3">
              {(activities || []).length === 0 ? (
                <p className="text-gray-400">No recent activities.</p>
              ) : (
                activities.map((log) => (
                  <div key={log._id} className="bg-black p-3 rounded shadow-sm border border-gray-700">
                    <div className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                    <div className="text-white">
                      {log.action_type === 'EXPENSE_ADDED' ? (
                        <span>Expense ₹{log.meta?.amount} {log.meta?.description ? `- ${log.meta.description}` : ''}</span>
                      ) : log.action_type === 'GROUP_CREATED' ? (
                        <span>Group created: {log.meta?.name}</span>
                      ) : (
                        <span>{log.action_type}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeMenu === "addgroup" && (
          <div>
           <h1 className="text-2xl font-bold mb-4 text-[#C8FF01]">Add New Group</h1>
           <AddGroupForm onGroupAdded={() => setActiveMenu("groups")} />
          </div>
        )}

      </div>

    </div>
  );
};

export default Dashboard;
