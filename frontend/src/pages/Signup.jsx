import React,{useState} from "react";
import { Link ,useNavigate} from "react-router-dom";
import { toast } from "react-hot-toast";

const SignUp = () => {


    const navigate = useNavigate();

  const [form, setForm] = useState({
  names: "",
  email: "",
  password: "",
  code: ""
});

const sendOtp = async () => {
  if (!form.email) {
    toast.error("Please enter your email first");
    return;
  }
  try {
    const response = await fetch("/api/auth/signup/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: form.email })
    });
    if (response.ok) {
      toast.success("OTP sent to your email. Check inbox/spam.");
    } else if (response.status === 409) {
      const data = await response.json().catch(() => ({}));
      toast.error(data?.message || "Email already exists. Please sign in.");
    } else {
      const data = await response.json().catch(() => ({}));
      toast.error(data?.message || "Failed to send OTP. Try again.");
    }
  } catch (err) {
    console.error(err);
    toast.error("Network error while sending OTP");
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    // Verify OTP and create/login user
    const response = await fetch("/api/auth/signup/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: form.email,
        code: form.code,
        names: form.names,
        password: form.password
      })
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Signup verified:", data);
      toast.success("Signup verified. Welcome!");
      navigate("/dashboard");
    } else {
      toast.error(data?.message || "Invalid or expired OTP");
    }
  } catch (err) {
    console.error(err);
    toast.error("Network or server error");
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
            <button
              type="button"
              onClick={sendOtp}
              className="mt-2 inline-flex items-center px-3 py-2 rounded-lg border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black transition"
            >
              Send OTP
            </button>
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

          {/* OTP Code */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-300">OTP Code</label>
            <input
              type="text"
              name="code"
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Enter the 6-digit code"
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
