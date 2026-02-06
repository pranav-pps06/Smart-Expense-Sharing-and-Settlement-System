import React, { useState } from "react";
import GroupTile from "../components/GroupTile";
import { FiUser } from "react-icons/fi";





const trialdashboard = () => {

    const [activeMenu, setActiveMenu] = useState("groups");
    
  return (
    <div>
      <div className="min-h-screen flex bg-gray-900">

      {/* LEFT SIDEBAR */}
      <div className="w-60 bg-black text-white p-6 flex flex-col justify-between">

        <div>
          <img src="/company-logo.png" alt="Logo" className="w-40 mx-auto mb-6" />

          {1 && (
            <h2 className="text-xl font-semibold text-center text-[#C8FF01]">
              Welcome, {"hello"}
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
        {1 && (
          <div className="absolute top-6 right-6">
            <div className="group relative inline-block">
              <FiUser className="text-3xl cursor-pointer text-[#C8FF01]" />

              <div className="opacity-0 group-hover:opacity-100 transition bg-[#212121] border border-gray-500 shadow-lg p-4 rounded-lg absolute right-0 w-48 mt-2 text-white">
                <p className="font-semibold">{"hello123"}</p>
                <p className="text-sm text-gray-200">{"hello@12.com"}</p>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT BASED ON ACTIVE MENU */}
        {activeMenu === "groups" && (
          <div>
            <h1 className="text-2xl font-bold mb-4 text-[#C8FF01]">Your Groups</h1>
            <div className="grid grid-cols-2 gap-4">
              <GroupTile  name={"goa"} description={"firstg"} />
              <GroupTile name={"hyd"} description={"secondg"} />
              <GroupTile  name={"ka"} description={"thirdg"} />
            </div>
          </div>
        )}

        {activeMenu === "activities" && (
          <div>
            <h1 className="text-2xl font-bold mb-4 text-[#C8FF01]">Recent Activities</h1>
            <div className="space-y-3">
              <p  className="bg-black p-3 rounded shadow-sm border border-gray-700 text-[#C8FF01]">
                  {"activities"}
                </p>
            </div>
          </div>
        )}

        {activeMenu === "addgroup" && (
          <div>
            <h1 className="text-2xl font-bold mb-4 text-[#C8FF01]">Add New Group</h1>
            <div className="bg-black p-6 shadow rounded max-w-md">
              <p className="text-gray-200">This form will be implemented here later.</p>
            </div>
          </div>
        )}

      </div>

    </div>
    </div>
  )
}

export default trialdashboard
