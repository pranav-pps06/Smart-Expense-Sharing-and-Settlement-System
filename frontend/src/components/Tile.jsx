import React from "react";

const Tile = ({ title, description }) => {
  return (
    <div
      className="
        w-72 h-60 
        bg-white/10 backdrop-blur-xl
        border border-white/20 
        rounded-2xl 
        flex flex-col items-center justify-center
        p-6 text-center
        shadow-[0_0_20px_#C8FF0135]
        hover:shadow-[0_0_35px_#C8FF01aa]
        hover:scale-105
        transition-all duration-300
      "
    >
      <h2 className="text-2xl font-bold text-[#C8FF01] mb-3">
        {title}
      </h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default Tile;
