import React from "react";

const GroupTile = ({ name, createdBy, description, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-black p-4 rounded-xl shadow hover:shadow-lg cursor-pointer transition w-full"
    >
      <h2 className="text-lg font-bold">{name}</h2>
      {createdBy ? (
        <p className="text-gray-500 text-sm mt-1">Created by {createdBy}</p>
      ) : description ? (
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      ) : null}
    </button>
  );
};

export default GroupTile;
