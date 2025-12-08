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
      "http://localhost:3000/loginuser",
      form,                     
      { withCredentials: true } 
    );    
    console.log("User logged in successfully", response.data);
    // Fetch user via /api/auth/me to populate context then navigate
    try {
      const me = await axios.get("http://localhost:3000/api/auth/me", { withCredentials: true });
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

        {/* Divider */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 h-px bg-white/20"></div>
          <span className="text-gray-400 text-sm">OR</span>
          <div className="flex-1 h-px bg-white/20"></div>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={() => window.location.href = "http://localhost:3000/auth/google"}
          className="
            w-full mt-4 py-3 px-4
            bg-white
            text-gray-700 font-medium
            rounded-lg
            flex items-center justify-center gap-3
            hover:bg-gray-100
            shadow-md
            active:scale-95
            transition-all
          "
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

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
