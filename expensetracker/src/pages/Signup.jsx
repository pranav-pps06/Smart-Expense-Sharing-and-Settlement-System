import React,{useState} from "react";
import { Link ,useNavigate} from "react-router-dom";

const SignUp = () => {


    const navigate = useNavigate();

  const [form, setForm] = useState({
  names: "",
  email: "",
  password: ""
});

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:3000/newuser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    
    const data = await response.json(); 

    if (response.ok) {
      console.log("user added successfully",data);
      navigate("/login");
    } else {
      console.log("user didnt add successfully",data.sqlMessage);
    }

  } catch (err) {
    console.error(err);
    console.log("Network or server error");
  }
};


  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div
        className="
          w-full max-w-md
          bg-white/10 backdrop-blur-xl
          border border-white/20
          rounded-2xl p-8
          shadow-[0_0_30px_rgba(200,255,1,0.08)]
          relative
          text-white
        "
      >
        {/* Neon glow top accent */}
       

        <h1 className="text-3xl font-bold text-center text-[#C8FF01] ">
          Create Account
        </h1>

        <p className="text-center text-gray-300 mt-2">
          Join ExpenseTracker and simplify splitting bills with friends.
        </p>

        <div className="mx-auto mt-4 w-24 h-1 rounded-full bg-[#C8FF01]/60 shadow-[0_0_20px_rgba(200,255,1,0.25)]"></div>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>

          {/* Full Name */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-300">Full Name</label>
            <input
              type="text"
              name="names"
              onChange={(e) => setForm({ ...form, names: e.target.value })}
              placeholder="Enter your name"
              className="
                mt-1 px-4 py-2
                rounded-lg
                bg-black/40
                border border-white/20
                text-white
                placeholder-white/40
                focus:outline-none
                focus:border-[#C8FF01]
                focus:shadow-[0_0_18px_rgba(200,255,1,0.20)]
                transition
              "
            />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
               name="email"
               onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="
                mt-1 px-4 py-2
                rounded-lg
                bg-black/40
                border border-white/20
                text-white
                placeholder-white/40
                focus:outline-none
                focus:border-[#C8FF01]
                focus:shadow-[0_0_18px_rgba(200,255,1,0.20)]
                transition
              "
            />
          </div>

          {/* Phone Number */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-300">Phone Number</label>
            <input
              type="tel"
              placeholder="Enter phone number"
              className="
                mt-1 px-4 py-2
                rounded-lg
                bg-black/40
                border border-white/20
                text-white
                placeholder-white/40
                focus:outline-none
                focus:border-[#C8FF01]
                focus:shadow-[0_0_18px_rgba(200,255,1,0.20)]
                transition
              "
            />
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-300">Password</label>
            <input
              type="password"
              name="password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create a password"
              className="
                mt-1 px-4 py-2
                rounded-lg
                bg-black/40
                border border-white/20
                text-white
                placeholder-white/40
                focus:outline-none
                focus:border-[#C8FF01]
                focus:shadow-[0_0_18px_rgba(200,255,1,0.20)]
                transition
              "
            />
          </div>

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
            CREATE ACCOUNT
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 h-px bg-white/20"></div>
          <span className="text-gray-400 text-sm">OR</span>
          <div className="flex-1 h-px bg-white/20"></div>
        </div>

        {/* Google Sign Up Button */}
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
          Sign up with Google
        </button>

        {/* Footer Links */}
        <p className="text-center text-gray-300 mt-4">
          Already have an account?
          <Link to="/login" className="text-[#C8FF01] hover:underline ml-1">
            Sign In
          </Link>
        </p>

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

export default SignUp;
