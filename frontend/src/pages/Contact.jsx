import React from "react";
import { FiMapPin, FiPhone, FiMail, FiClock } from "react-icons/fi";

const Contact = () => {
  return (
    <div className="min-h-screen w-full bg-black text-white pt-40 px-6 md:px-20">

      {/* Page Heading */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#C8FF01] ">
          Get in Touch
        </h1>

        <p className="mt-4 text-gray-300 text-lg">
          Use ExpenseTracker to simplify your financial life.  
          If you need help, have suggestions, or want to collaborate—  
          our team is always here for you.
        </p>
      </div>

      {/* Contact Section */}
      <div className="mt-20 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

        {/* LEFT SIDE — CONTACT DETAILS */}
        <div className="space-y-8">

          <div className="flex items-start gap-4 bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/20">
            <div className="text-[#C8FF01] text-3xl">
              <FiMapPin />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#C8FF01]">Address</h3>
              <p className="text-gray-300">
                #123, ExpenseTracker HQ  
                Bengaluru, Karnataka, India
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/20">
            <div className="text-[#C8FF01] text-3xl">
              <FiPhone />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#C8FF01]">Phone</h3>
              <p className="text-gray-300">+91 98765 43210</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/20">
            <div className="text-[#C8FF01] text-3xl">
              <FiMail />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#C8FF01]">Email</h3>
              <p className="text-gray-300">support@expensetracker.com</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/10 backdrop-blur-lg p-5 rounded-xl border border-white/20">
            <div className="text-[#C8FF01] text-3xl">
              <FiClock />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#C8FF01]">Timings</h3>
              <p className="text-gray-300">Mon – Sat: 9:00 AM to 7:00 PM</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — QUERY FORM */}
        <div className="bg-white/10 backdrop-blur-lg p-8 md:p-10 rounded-2xl border border-white/20 shadow-xl">
          <h3 className="text-2xl font-bold text-[#C8FF01] mb-6">
            Send Us a Message
          </h3>

          <form className="space-y-5">
            <div>
              <label className="block text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:border-[#C8FF01] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:border-[#C8FF01] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Subject</label>
              <input
                type="text"
                placeholder="Query subject"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:border-[#C8FF01] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Description</label>
              <textarea
                rows="4"
                placeholder="Describe your query..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:border-[#C8FF01] focus:outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-3 mt-4 text-black font-semibold rounded-xl bg-[#C8FF01] hover:bg-[#b3e600] transition"
            >
              Submit
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Contact;
