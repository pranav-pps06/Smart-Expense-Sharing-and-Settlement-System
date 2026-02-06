import React from 'react'
import { Link } from 'react-router-dom'


const Navbar = () => {
  return (
    <div className="
      fixed top-5 left-1/2 -translate-x-1/2 
      w-[90%] md:w-[75%] 
      flex items-center justify-between 
      px-6 py-3
      bg-white/20 backdrop-blur-lg 
      border border-white/30
      rounded-2xl shadow-xl 
      text-white z-50
    ">
      
      <img className="h-12" src="/company-logo.png" alt="Company Logo" />

      <div className="flex gap-10">
        <Link to="/" className="hover:text-gray-300 transition">HOME</Link>
        <Link to="/about" className="hover:text-gray-300 transition">ABOUT-PROJECT</Link>
        <Link to="/contact" className="hover:text-gray-300 transition">CONTACT</Link>
      </div>

      <Link
  to="/login"
  className="
    px-5 py-2
    bg-white/20
    border border-white/30
    rounded-xl
    backdrop-blur-md
    font-semibold
    hover:bg-white/30
    hover:border-white/40
    hover:text-gray-200
    active:scale-95
    transition-all duration-200
  "
>
  SIGN-IN
</Link>
    </div>
  )
}

export default Navbar
