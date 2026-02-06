import React,{useState} from "react";
import axios from "axios";
import { useAuth } from "../lib/auth";

import { Link , useNavigate } from "react-router-dom";

const Login = () => {

  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await axios.post(
      "/loginuser",
      form,                     
      { withCredentials: true } 
    );    
    console.log("User logged in successfully", response.data);
    // Fetch user via /api/auth/me to populate context then navigate
    try {
      const me = await axios.get("/api/auth/me", { withCredentials: true });
      setUser(me.data.user || null);
    } catch (e) {
      console.warn("Failed to load user after login", e?.message);
    }
    navigate("/dashboard");

  } catch (err) {
    console.error(err);
    if (err.response) {      
      console.log(err.response.data.message || "Login failed");
    } else {     
      console.log("Network or server error");
    }
  }
};






  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">

      <div className="
        w-full max-w-md
        bg-white/10 backdrop-blur-xl
        border border-white/20
        rounded-2xl p-8
        shadow-[0_0_30px_rgba(200,255,1,0.08)]
        relative
      ">

       
        

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-[#C8FF01] ">
          Welcome Back
        </h2>

        <p className="text-center text-gray-300 mt-2">
          Sign in to continue managing your expenses.
        </p>

        {/* Divider Glow */}
        <div className="mx-auto mt-4 w-24 h-1 rounded-full bg-[#C8FF01]/60 shadow-[0_0_20px_rgba(200,255,1,0.25)]"></div>

        {/* Form */}
        <form className="flex flex-col gap-5 mt-8" onSubmit={handleSubmit}>

          {/* Email */}
          <input
            type="email"
            name="email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="
              px-4 py-3
              rounded-lg
              bg-black/40
              border border-white/20
              text-white placeholder-white/40
              focus:outline-none
              focus:border-[#C8FF01]
              focus:shadow-[0_0_18px_rgba(200,255,1,0.20)]
              transition
            "
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            name="password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="
              px-4 py-3
              rounded-lg
              bg-black/40
              border border-white/20
              text-white placeholder-white/40
              focus:outline-none
              focus:border-[#C8FF01]
              focus:shadow-[0_0_18px_rgba(200,255,1,0.20)]
              transition
            "
          />

          {/* Button */}
          <button
            className="
              w-full py-3
              bg-[#C8FF01]
              text-black font-bold
              rounded-lg
              hover:bg-[#d9ff4a]
              shadow-[0_10px_25px_rgba(200,255,1,0.25)]
              active:scale-95
              transition-all
            "
          >
            SIGN IN
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-center mt-5 text-gray-300">
          New here?
          <Link to="/signup" className="ml-1 text-[#C8FF01] hover:underline">
            Create an account
          </Link>
        </p>

        {/* Back to Home moved to bottom */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-gray-300 hover:text-[#C8FF01] underline text-sm transition"
          >
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
