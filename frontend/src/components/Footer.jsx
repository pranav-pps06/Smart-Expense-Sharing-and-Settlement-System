import React from "react";
import { FaInstagram, FaTwitter, FaGithub } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="
      w-full 
      bg-black 
      text-white 
      border-t border-white/10
      mt-20
      py-10
      flex flex-col items-center justify-center
      gap-6
    ">
      
 
      

      {/* Links */}
      

      {/* Social Icons */}
      <div className="flex gap-6 text-2xl">
        <FaInstagram className="hover:text-[#C8FF01] transition-all duration-300 cursor-pointer" />
        <FaTwitter className="hover:text-[#C8FF01] transition-all duration-300 cursor-pointer" />
        <FaGithub className="hover:text-[#C8FF01] transition-all duration-300 cursor-pointer" />
      </div>

      {/* Bottom Text */}
      <p className="text-sm text-gray-400 mt-4">
        Built with ❤️ using React & Tailwind CSS
      </p>

      <p className="text-xs text-gray-500">
        © {new Date().getFullYear()} EXPENSETRACKER - All rights reserved.
      </p>

    </footer>
  );
};

export default Footer;
