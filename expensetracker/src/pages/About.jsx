import React from "react";

const About = () => {
  return (
    <div className="min-h-screen w-full bg-black text-white pt-40 px-6 md:px-20">
      
      {/* Header */}
      <h1 className="text-4xl md:text-6xl font-extrabold text-center text-[#C8FF01] ">
        About This Project
      </h1>

      <p className="text-gray-300 text-center mt-4 max-w-3xl mx-auto text-lg">
        Welcome to <span className="text-[#C8FF01] font-semibold">ExpenseTracker</span> — 
        a smart solution for managing shared expenses.
      </p>

      {/* Section Container */}
      <div className="mt-16 max-w-5xl mx-auto space-y-16">

        {/* What It Is */}
        <section className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-[#C8FF01] mb-4">
            What Is ExpenseTracker?
          </h2>

          <p className="text-gray-300 leading-relaxed">
            ExpenseTracker is designed to make splitting bills simple, transparent, 
            and stress-free. Whether you're sharing rent with roommates, planning a trip 
            with friends, or organizing team expenses, this platform helps you track 
            every transaction effortlessly.
            <br /><br />
            Users can create groups, add expenses, view balances, and settle up 
            without confusion. Our system ensures clarity and automatic calculations 
            so you never need to manually split bills or debate who owes whom.
          </p>
        </section>

        {/* Mission */}
        <section className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-[#C8FF01] mb-4">
            ⭐ Our Mission
          </h2>

          <p className="text-gray-300 leading-relaxed">
            To simplify shared financial management by providing a transparent, 
            intuitive, and efficient platform for tracking and splitting expenses.
          </p>
        </section>

        {/* Unique Features */}
        <section className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-[#C8FF01] mb-6">
            ⭐ What Makes This Project Unique
          </h2>

          <ul className="text-gray-300 space-y-3 list-disc pl-6">
            <li>Smart integration of SQL + NoSQL databases.</li>
            <li>Clean and intuitive dashboard-based UI.</li>
            <li>Secure login system with JWT authentication and private routing.</li>
            <li>Real-time balance updates across groups and members.</li>
            <li>Fast, lightweight, and optimized for modern browsers.</li>
          </ul>
        </section>

        {/* Users */}
        <section className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-[#C8FF01] mb-6">
            ⭐ Who Is This Project For?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <p>• Friends sharing everyday expenses</p>
            <p>• Students / roommates living together</p>
            <p>• Travel groups</p>
            <p>• Project teams managing pooled funds</p>
            <p>• Anyone needing a simple expense tool</p>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-[#C8FF01] mb-6">
            ⚙ Tech Stack
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            {["React", "Tailwind CSS", "Node.js", "Express", "MongoDB", "MySQL"].map(
              (item) => (
                <div
                  key={item}
                  className="bg-white/5 border border-white/10 rounded-xl py-4 text-gray-200"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default About;
