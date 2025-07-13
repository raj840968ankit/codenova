import { useContext } from "react";
import { UserContext } from "../context/user.context.jsx"; // Import the UserContext
import { useState } from "react";
import axios from "../config/axios.js"; // Import axios instance
import { useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation

export const Home = () => {
  // eslint-disable-next-line no-unused-vars
  const { user, setUser } = useContext(UserContext); // Access user from context
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]); // State to hold projects

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get("/projects/all");
        setProjects(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchProjects();
  }, []);

  // After creating a project, fetch projects again to update the list
  const createProjectHandler = async (event) => {
    event.preventDefault();
    try {
      // eslint-disable-next-line no-unused-vars
      const response = await axios.post("/projects/create", {
        name: projectName,
      });
      setProjectName("");
      setIsModalOpen(false);

      await axios.get("/projects/all").then((res) => setProjects(res.data));
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get("/users/logout");  // your logout endpoint
      localStorage.removeItem("token");  // optional since you're using cookies now
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-inter">

      {/* 🔓 Logout button */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md"
      >
        Logout
      </button>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center drop-shadow-sm">
          Your Projects
        </h1>

        <div className="projects grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {/* New Project Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-white border border-dashed border-blue-300 rounded-xl shadow-lg
                       hover:bg-blue-50 hover:border-blue-500 transition-all duration-300 ease-in-out
                       transform hover:scale-105 cursor-pointer text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mb-2 text-blue-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-xl font-semibold">New Project</span>
          </button>

          {/* Existing Projects */}
          {projects.map((project) => (
            <div
              key={project._id}
              className="project relative p-6 bg-white border border-gray-200 rounded-xl shadow-md
                         hover:shadow-xl hover:border-blue-400 transition-all duration-300 ease-in-out
                         transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              onClick={() => navigate(`/project`, { state: { project } })}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-3 truncate">
                {project.name}
              </h3>
              <div className="flex items-center justify-center bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-sm font-medium self-end">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372c.937 0 1.848-.112 2.713-.329m-1.34-3.565a4.487 4.487 0 0 0 9.424 0m-2.28 0a.75.75 0 0 0-1.079-.916l-3.056 3.055m1.166-2.543c.12-.096.257-.168.4-.208m.427-.083h-7.68m0 0H7.5m7.5 0c1.378 0 2.67.236 3.844.654M7.5 14.25a3.605 3.605 0 0 0-3.14 1.579m-.768 4.296A9.38 9.38 0 0 1 5.334 19.5c.843 0 1.65-.105 2.409-.304m2.414-7.166a.75.75 0 0 0-1.079-.916l-3.056 3.055M11.25 10.5h-1.5m1.5 0v-1.5m0 1.5l-3.056 3.055M12 10.5V6"
                  />
                </svg>
                <p className="text-sm">Collaborators: {project.users.length}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md transform scale-95 animate-scale-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Create New Project
            </h2>
            <form onSubmit={createProjectHandler}>
              <label
                htmlFor="project"
                className="block mb-2 text-md font-medium text-gray-700"
              >
                Project Name
              </label>
              <input
                id="project"
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6
                           focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-transparent
                           transition-all duration-200 text-gray-800 placeholder-gray-400"
                placeholder="Enter project name (e.g., 'Website Redesign', 'Mobile App Beta')"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold
                             hover:bg-gray-300 transition-colors duration-200
                             focus:outline-none focus:ring-2 focus:ring-gray-400"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold
                             hover:bg-blue-700 transition-colors duration-200
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add custom keyframe animations for better visual effects */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </main>
  );
};
