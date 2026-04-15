import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Dashboard() {
  const { admin, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const cards = [
    {
      title: "Templates",
      desc: "Create & manage certificate templates",
      icon: "🎨",
      path: "/templates",
      color: "from-indigo-500 to-blue-600",
    },
    {
      title: "Create Batch",
      desc: "Upload CSV & create certificate batch",
      icon: "📤",
      path: "/create-batch",
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Batches",
      desc: "View, preview & release batches",
      icon: "📋",
      path: "/batches",
      color: "from-purple-500 to-pink-600",
    },
    ...(admin?.role === "superadmin"
      ? [
          {
            title: "Identity Mapping",
            desc: "Upload central email and MI mapping CSV",
            icon: "🧩",
            path: "/identity-mapping",
            color: "from-amber-500 to-orange-600",
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Top bar */}
      <header className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-lg">🎓</span>
            </div>
            <h1 className="text-xl font-bold text-white">MI Certificates</h1>
          </div>

          <div className="flex items-center gap-4">
            {admin && (
              <div className="text-right">
                <p className="text-sm font-medium text-white">{admin.name}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {admin.role === "superadmin" ? "Super Admin" : "CG"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {admin.department_name}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 mt-1">
            Manage certificates for{" "}
            <span className="text-indigo-400 font-medium">
              {admin?.department_name || "your department"}
            </span>
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 text-left hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <span className="text-2xl">{card.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {card.title}
              </h3>
              <p className="text-sm text-gray-400">{card.desc}</p>
              <div className="absolute top-6 right-6 text-gray-600 group-hover:text-gray-400 transition-colors">
                →
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;