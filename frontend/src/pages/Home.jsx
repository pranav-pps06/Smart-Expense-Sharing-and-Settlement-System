import Tile from "../components/Tile";

function Home() {
  return (
    <>
      <div className="flex flex-col items-center justify-center text-center px-6 min-h-[calc(100vh-100px)]">
        <h3 className="text-xl md:text-2xl font-semibold tracking-wide">
          Personal hub for group expenses
        </h3>

        <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-tight text-[#C8FF01]">
          View balances, manage groups,<br /> and stay in control
        </h1>

        <div className="mt-6 w-24 h-1 bg-[#C8FF01] rounded-full" />
      </div>

      <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 px-6 pb-20">
        <Tile 
          title="Intelligent Expense Insights"
          description="Get meaningful summaries of your spending patterns..."
        />
        <Tile 
          title="Seamless Group Collaboration"
          description="Add members, share expenses instantly..."
        />
        <Tile 
          title="Fast & Simple Expense Entry"
          description="Add bills quickly with a clean interface..."
        />
      </div>
    </>
  );
}

export default Home;
