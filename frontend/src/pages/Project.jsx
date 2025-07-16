import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios.js";
import {
    initializeSocket,
    receiveMessage,
    sendMessage,
} from "../config/socket.js";
import { useContext } from "react";
import { UserContext } from "../context/user.context.jsx";
import Markdown from "markdown-to-jsx";
import hljs from "highlight.js";
import 'highlight.js/styles/nord.css';
import { getWebContainer } from "../config/webContainer.js";


// Component to handle syntax highlighting for code blocks in Markdown
function SyntaxHighlightedCode(props) {
    const ref = useRef(null);

    useEffect(() => {
        // Check if the ref exists, if the class includes 'lang-' (indicating a language),
        // and if hljs is available globally.
        if (ref.current && props.className?.includes("lang-") && window.hljs) {
            // Highlight the code element
            window.hljs.highlightElement(ref.current);

            // Remove the data-highlighted attribute to allow re-highlighting if content changes
            ref.current.removeAttribute("data-highlighted");
        }
    }, [props.className, props.children]); // Re-run if class or children (code content) changes

    return <code {...props} ref={ref} />;
}

export const Project = () => {
    // State variables for UI and application logic
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false); // Controls visibility of the collaborators side panel
    const [isModalOpen, setIsModalOpen] = useState(false); // Controls visibility of the add collaborators modal
    const [selectedUserIds, setSelectedUserIds] = useState([]); // Stores IDs of users selected in the modal
    const [users, setUsers] = useState([]); // All registered users
    const [usersWithProjects, setUsersWithProjects] = useState([]); // Users currently collaborating on this project
    const [message, setMessage] = useState(""); // Current message being typed in the chat input
    const [messages, setMessages] = useState([]); // Array to store all chat messages
    const { user } = useContext(UserContext); // Current authenticated user from context
    const messageBox = useRef(); // Ref for the chat message container to enable auto-scrolling
    const [fileTree, setFileTree] = useState({}); // Represents the project's file structure
    const [currentFile, setCurrentFile] = useState(null); // The currently active file in the editor
    const [openFiles, setOpenFiles] = useState([]); // List of files currently open as tabs in the editor
    const [webContainer, setWebContainer] = useState(null); // WebContainer instance for running the project
    const [iframeUrl, setIframeUrl] = useState(null); // URL for the live preview iframe
    const [runProcess, setRunProcess] = useState(null); // Reference to the running WebContainer process
    const [runError, setRunError] = useState(""); // Add this state at the top

    const location = useLocation(); // Hook to access route state (project ID)

    // Effect hook for initial setup: fetching users, initializing socket, and WebContainer
    useEffect(() => {
        // Function to fetch all users from the backend
        const fetchUsers = async () => {
            try {
                const response = await axios.get("/users/all");
                setUsers(response.data);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers(); // Call fetch users on component mount

        // Initialize WebSocket connection for the current project
        initializeSocket(location.state.project._id);

        // Listen for incoming chat messages from the server
        receiveMessage("server-message", ({ message, sender }) => {
            // Only append if the sender is NOT the current user
            if (sender.email === user.email) return;
            appendIncomingMessage({ message, sender: sender.email });
        });

        // Listen for AI-generated messages, which might include file tree updates
        receiveMessage("server-ai-message", ({ aiResult, sender }) => {
            const message = JSON.parse(aiResult);
            const receivedFileTree = message.fileTree || {};

            // Ensure message.fileTree is an object before mounting and setting state
            webContainer?.mount(receivedFileTree);

            // Merge with existing fileTree
            setFileTree((prev) => {
                const merged = { ...prev, ...receivedFileTree };
                saveFileTree(merged);
                return merged;
            });
            appendAIMessage({ message, sender });
        });
    }, []);

    useEffect(() => {
        if (!webContainer) {
            getWebContainer().then((container) => setWebContainer(container));
            console.log("WebContainer started");
        }
    }, [webContainer]);

    // Fetch users with projects (collaborators) on mount and when project changes
    useEffect(() => {
        const fetchUsersWithProjects = async () => {
            try {
                const response = await axios.get(
                    `/projects/get-project/${location.state.project._id}`
                );
                setUsersWithProjects(response.data.users);
                setFileTree(response.data.fileTree);
            } catch (error) {
                console.error("Error fetching users with projects:", error);
            }
        };
        fetchUsersWithProjects();
    }, [location.state.project._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    function send() {
        if (!message.trim()) return;
        sendMessage("project-message", {
            message,
            sender: user,
            projectId: location.state.project._id,
        });
        appendOutgoingMessage({ message, user });
        setMessage("");
    }

    // 3. Update the file-update message handler to prevent self-updates:
    useEffect(() => {
        receiveMessage("file-update", ({ fileName, contents, sender }) => {
            // Ignore updates from self
            if (sender === user.email) return;

            // Only update if content actually changed and file is open
            if (fileTree[fileName]?.file.contents !== contents) {
                setFileTree(prev => ({
                    ...prev,
                    [fileName]: {
                        file: { contents }
                    }
                }));
            }
        });
    }, [user.email, fileTree]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        receiveMessage("file-delete", ({ fileName, sender }) => {
            // Optionally, ignore if the sender is the current user
            if (sender === user.email) return;
            setFileTree((prev) => {
                const updated = { ...prev };
                delete updated[fileName];
                return updated;
            });
            setOpenFiles((prev) => prev.filter((f) => f !== fileName));
            if (currentFile === fileName) {
                setCurrentFile(null);
            }
        });
    }, [user.email, currentFile]);

    // Handler for selecting/deselecting a user from modal
    const handleSelectUser = (userId) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    // Handler for Add Collaborator button
    const handleAddCollaborator = () => {
        if (selectedUserIds.length === 0) return;

        const addCollaborators = async () => {
            try {
                await axios.put("projects/add-user", {
                    projectId: location.state.project._id,
                    users: selectedUserIds,
                });
                // Refresh collaborators after adding
                const updated = await axios.get(
                    `/projects/get-project/${location.state.project._id}`
                );
                setUsersWithProjects(updated.data.users);
            } catch (error) {
                console.error("Error adding collaborators:", error);
            }
        };

        addCollaborators();
        setIsModalOpen(false);
    };

    // Scroll to the bottom of the message box when a new message is added
    function scrollToBottom() {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight;
        }
    }

    // Append incoming user message
    function appendIncomingMessage({ message, sender }) {
        setMessages((prev) => [
            ...prev,
            {
                type: "incoming",
                sender: sender || "Unknown",
                message,
            },
        ]);
    }

    // Append outgoing user message
    function appendOutgoingMessage({ message, user }) {
        setMessages((prev) => [
            ...prev,
            {
                type: "outgoing",
                sender: user.email || "You",
                message,
            },
        ]);
    }

    // Append AI message (rendered as markdown)
    function appendAIMessage({ message, sender }) {
        setMessages((prev) => [
            ...prev,
            {
                type: "ai",
                sender: sender || "AI",
                message,
            },
        ]);
    }

    function saveFileTree(ft) {
        axios
            .put("/projects/update-file-tree", {
                projectId: location.state.project._id,
                fileTree: ft,
            })
            .then((res) => {
                console.log(res.data);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    const handleRunProject = async () => {
        if (!webContainer) {
            const msg = ("WebContainer not initialized.");
            console.error(msg);
            setRunError(msg);
            return;
        }

        setRunError("");
        try {
            await webContainer.mount(fileTree);

            const installProcess = await webContainer.spawn("npm", ["install"]);
            installProcess.output.pipeTo(
                new WritableStream({
                    write(chunk) {
                        console.log(chunk);
                        if (typeof chunk === "string" && chunk.toLowerCase().includes("error")) {
                            setRunError(prev => prev + "\n" + chunk);
                        }
                    },
                })
            );
            await installProcess.exit; // Wait for install to complete

            if (runProcess) {
                runProcess.kill();
            }

            let tempRunProcess = await webContainer.spawn("npm", ["start"]);
            tempRunProcess.output.pipeTo(
                new WritableStream({
                    write(chunk) {
                        console.log(chunk);
                        if (typeof chunk === "string" && chunk.toLowerCase().includes("error")) {
                            setRunError(prev => prev + "\n" + chunk);
                        }
                    },
                })
            );
            setRunProcess(tempRunProcess);

            webContainer.on("server-ready", (port, url) => {
                console.log(port, url);
                setIframeUrl(url);
            });
        } catch (error) {
            console.error("Error running project:", error);
            setRunError(error.message || String(error));
        }
    };

    // Create debounced save functions
    const saveTimeoutRef = useRef(null);

    // 2. Replace the handleFileChange function with this:
    const handleFileChange = useCallback(
        (fileName, updatedContent) => {
            // Only update if content actually changed
            if (fileTree[fileName]?.file.contents === updatedContent) return;

            const ft = {
                ...fileTree,
                [fileName]: {
                    file: {
                        contents: updatedContent,
                    },
                },
            };

            setFileTree(ft);

            // Send update to other collaborators immediately
            sendMessage("file-update", {
                fileName,
                contents: updatedContent,
                projectId: location.state.project._id,
                sender: user.email,
            });

            // Debounce saving to database
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
                saveFileTree(ft);
            }, 1000);
        },
        [fileTree, user.email, location.state.project._id]
    );

    return (
        <main className="flex flex-col lg:flex-row w-screen overflow-hidden font-inter min-h-screen lg:h-screen">
            {/* Left Section: Chat and Collaborators Panel */}
            {/* On mobile, this section takes full width and full height of the screen. */}
            {/* On large screens, it maintains its fixed width. */}
            <section className="left flex flex-col w-full h-[calc(100vh-2rem)] lg:h-full lg:w-[400px] bg-slate-100 relative shadow-lg rounded-lg m-2 lg:m-4 overflow-hidden">
                {/* Header for Chat/Collaborators */}
                <header className="flex justify-between items-center p-3 px-4 w-full bg-slate-200 rounded-t-lg shadow-sm flex-shrink-0">
                    <button
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md"
                        onClick={() => setIsModalOpen(true)}
                        aria-label="Add Collaborators"
                    >
                        <i className="ri-user-add-fill text-lg"></i>
                        <span className="hidden sm:inline">Add Collaborators</span>
                    </button>

                    <button
                        className="p-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                        aria-label="Toggle Collaborators Panel"
                    >
                        <i className="ri-group-fill text-2xl"></i>
                    </button>
                </header>

                {/* Message Area */}
                <div className="message-area flex-grow flex flex-col min-h-0 p-2 overflow-hidden">
                    <div
                        ref={messageBox}
                        className="message-box flex-grow flex flex-col gap-2 overflow-y-auto scrollbar-hide p-2 rounded-md bg-white shadow-inner"
                    >
                        {/* Render messages from state */}
                        {messages.map((msg, idx) => {
                            if (msg.type === "incoming") {
                                return (
                                    <div
                                        key={idx}
                                        className="message max-w-[70%] flex flex-col p-3 bg-gray-200 rounded-lg shadow-sm self-start"
                                    >
                                        <small className="text-xs text-gray-600 mb-1 font-medium">
                                            {msg.sender}
                                        </small>
                                        <p className="text-sm text-gray-800">{msg.message}</p>
                                    </div>
                                );
                            }
                            if (msg.type === "outgoing") {
                                return (
                                    <div
                                        key={idx}
                                        className="ml-auto message max-w-[70%] flex flex-col p-3 bg-blue-500 text-white rounded-lg shadow-sm self-end"
                                    >
                                        <small className="text-xs opacity-80 mb-1 font-medium">
                                            {msg.sender}
                                        </small>
                                        <p className="text-sm">{msg.message}</p>
                                    </div>
                                );
                            }
                            if (msg.type === "ai") {
                                return (
                                    <div
                                        key={idx}
                                        className="message max-w-[90%] flex flex-col p-3 bg-slate-900 text-white rounded-lg shadow-md self-start border border-blue-700"
                                    >
                                        <small className="text-xs opacity-75 mb-1 font-medium">
                                            {msg.sender}
                                        </small>
                                        <div
                                            className="text-sm markdown-body"
                                            style={{ color: "white" }}
                                        >
                                            <Markdown
                                                options={{
                                                    overrides: {
                                                        code: {
                                                            component: SyntaxHighlightedCode,
                                                        },
                                                    },
                                                }}
                                            >
                                                {msg.message.text}
                                            </Markdown>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>

                    {/* Chat Input Field */}
                    <div className="inputField w-full flex border-t border-gray-300 bg-white p-2 rounded-b-lg shadow-inner flex-shrink-0">
                        <input
                            className="p-3 border border-gray-300 rounded-l-lg outline-none flex-grow focus:ring-2 focus:ring-blue-400 transition-all duration-200"
                            type="text"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && send()}
                            aria-label="Message input"
                        />
                        <button
                            className="px-6 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                            onClick={send}
                            aria-label="Send message"
                        >
                            <i className="ri-send-plane-fill text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Collaborators Side Panel */}
                <div
                    className={`sidePanel w-full sm:w-80 h-full bg-slate-50 flex flex-col gap-2 absolute transition-transform duration-300 ease-in-out z-40 rounded-lg shadow-xl ${isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
                        } top-0 left-0`}
                >
                    <header className="flex justify-between items-center p-3 px-4 bg-slate-200 rounded-t-lg shadow-sm flex-shrink-0">
                        <h1 className="font-semibold text-xl text-gray-800">
                            Collaborators
                        </h1>
                        <button
                            onClick={() => setIsSidePanelOpen(false)}
                            className="p-2 text-gray-700 hover:text-red-600 transition-colors duration-200"
                            aria-label="Close collaborators panel"
                        >
                            <i className="ri-close-fill font-semibold text-2xl"></i>
                        </button>
                    </header>

                    <div className="users flex flex-col gap-2 p-3 overflow-y-auto flex-grow">
                        {usersWithProjects && usersWithProjects.length > 0 ? (
                            usersWithProjects.map(({ email, _id }) => (
                                <div
                                    key={_id}
                                    className="user flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-lg">
                                        {email[0].toUpperCase()}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-sm font-semibold text-gray-800">
                                            {email}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 mt-4">
                                No collaborators yet.
                            </p>
                        )}
                    </div>
                </div>

                {/* Modal for Adding Collaborators */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto p-6 relative flex flex-col max-h-[90vh]">
                            <button
                                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Close modal"
                            >
                                <i className="ri-close-line text-2xl"></i>
                            </button>
                            <h2 className="text-2xl font-bold mb-5 text-center text-gray-800">
                                Select Users
                            </h2>
                            <ul className="divide-y divide-gray-200 flex-grow overflow-y-auto mb-6">
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <li
                                            key={user._id}
                                            className={`flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-all duration-200
                                            ${selectedUserIds.includes(user._id)
                                                    ? "bg-blue-100 ring-2 ring-blue-400"
                                                    : "hover:bg-blue-50"
                                                }`}
                                            onClick={() => handleSelectUser(user._id)}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center text-white font-bold text-lg">
                                                {user.email[0].toUpperCase()}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="font-semibold text-gray-800">
                                                    {user.email}
                                                </div>
                                            </div>
                                            {selectedUserIds.includes(user._id) && (
                                                <span className="ml-auto text-blue-600 font-bold text-xl">
                                                    &#10003;
                                                </span>
                                            )}
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500">
                                        No users available.
                                    </p>
                                )}
                            </ul>
                            <button
                                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 shadow-md
                                ${selectedUserIds.length === 0
                                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                                onClick={handleAddCollaborator}
                                disabled={selectedUserIds.length === 0}
                            >
                                Add Collaborator{selectedUserIds.length > 1 ? "s" : ""}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Right Section: File Explorer, Code Editor, and Iframe Preview */}
            {/* On mobile, this section will stack its children vertically, each taking full screen height when scrolled into view. */}
            {/* On large screens, it takes the remaining width and full height, maintaining the desktop layout. */}
            <section className="right bg-slate-50 flex-grow flex flex-col lg:flex-row m-2 lg:m-4 rounded-lg shadow-lg">
                {/* File Explorer */}
                {/* On mobile, it takes full width and full screen height. */}
                {/* On large screens, it takes a fixed max-width and full height. */}
                <div className="explorer h-[calc(100vh-2rem)] lg:h-full lg:max-w-[250px] w-full bg-slate-200 p-2 border-b lg:border-b-0 lg:border-r border-gray-300 flex-shrink-0 rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none overflow-y-auto">
                    <h2 className="text-lg font-bold text-gray-800 mb-3 px-2">Files</h2>
                    <div className="fileTree w-full">
                        {Object.keys(fileTree || {}).length > 0 ? (
                            Object.keys(fileTree).map((file, index) => (
                                <div key={index} className="flex items-center group">
                                    <button
                                        onClick={() => {
                                            setCurrentFile(file);
                                            setOpenFiles((prev) =>
                                                prev.includes(file) ? [...prev] : [...prev, file]
                                            );
                                        }}
                                        className="tree-element cursor-pointer p-2 px-4 flex items-center gap-2 w-full text-left rounded-md hover:bg-blue-200 transition-colors duration-150 mb-1 flex-grow"
                                    >
                                        <i className="ri-file-line text-blue-600"></i>
                                        <p className="font-medium text-gray-800 truncate">{file}</p>
                                    </button>
                                    {/* Delete Icon */}
                                    <button
                                        className="ml-2 p-1 rounded hover:bg-red-100 text-red-600 transition-colors duration-150"
                                        title="Delete file"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Remove from fileTree
                                            setFileTree((prev) => {
                                                const updated = { ...prev };
                                                delete updated[file];
                                                saveFileTree(updated);
                                                // Emit file delete event to other collaborators
                                                sendMessage("file-delete", {
                                                    fileName: file,
                                                    projectId: location.state.project._id,
                                                    sender: user.email,
                                                });
                                                return updated;
                                            });
                                            // Remove from openFiles and update currentFile if needed
                                            setOpenFiles((prev) => {
                                                const filtered = prev.filter((f) => f !== file);
                                                if (currentFile === file) {
                                                    setCurrentFile(filtered[0] || null);
                                                }
                                                return filtered;
                                            });
                                        }}
                                    >
                                        <i className="ri-delete-bin-6-line"></i>
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 mt-4 text-sm">
                                No files in project.
                            </p>
                        )}
                    </div>
                </div>

                {/* Code Editor Area */}
                {/* On mobile, this takes full screen height, stacking below file explorer. */}
                {/* On large, it takes flex-grow and is next to explorer. */}
                <div className="code-editor flex flex-col flex-grow h-[calc(100vh-2rem)] lg:h-full bg-white rounded-b-lg lg:rounded-r-lg lg:rounded-bl-none">
                    {/* File Tabs and Run Button */}
                    {/* File Tabs and Run Button */}
                    <div className="top flex justify-between items-center w-full bg-slate-100 border-b border-gray-200 p-2 shadow-sm flex-shrink-0">
                        <div className="files flex flex-row flex-nowrap overflow-x-auto scrollbar-hide max-w-[70vw] h-10">
                            {openFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="relative flex items-center group"
                                    style={{ minWidth: 0 }}
                                >
                                    <button
                                        onClick={() => setCurrentFile(file)}
                                        className={`open-file cursor-pointer p-2 px-4 flex items-center gap-2 w-fit text-sm font-medium rounded-t-md transition-colors duration-150
                    ${currentFile === file
                                                ? "bg-blue-500 text-white shadow-inner"
                                                : "bg-slate-200 text-gray-700 hover:bg-blue-100"
                                            }`}
                                        style={{
                                            maxWidth: 180,
                                            minWidth: 60,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            paddingRight: "28px",
                                            position: "relative",
                                        }}
                                    >
                                        <p className="truncate">{file}</p>
                                    </button>
                                    {/* Close button for each tab */}
                                    <button
                                        className="absolute right-1 top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-full p-0.5 text-xs text-gray-500 hover:text-red-500 shadow group-hover:visible"
                                        style={{
                                            visibility: openFiles.length > 1 ? "visible" : "hidden",
                                            zIndex: 10,
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenFiles((prev) => {
                                                const filtered = prev.filter((f) => f !== file);
                                                if (currentFile === file) {
                                                    const idx = prev.findIndex((f) => f === file);
                                                    const nextFile =
                                                        prev[idx - 1] || prev[idx + 1] || null;
                                                    setCurrentFile(nextFile);
                                                }
                                                return filtered;
                                            });
                                        }}
                                        aria-label={`Close ${file}`}
                                    >
                                        <i className="ri-close-line"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="actions flex gap-2 pr-2">
                            <button
                                onClick={handleRunProject}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-md"
                                aria-label="Run project"
                            >
                                <i className="ri-play-fill mr-1"></i> Run
                            </button>
                        </div>
                    </div>

                    {/* Code Editor Content */}
                    <div className="bottom flex flex-grow h-0">
                        {currentFile &&
                            fileTree[currentFile] &&
                            fileTree[currentFile].file ? (
                            <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-900 text-white rounded-b-lg">
                                {currentFile && fileTree[currentFile] && fileTree[currentFile].file ? (
                                    <pre className="hljs h-full m-0 p-4 text-sm leading-relaxed overflow-auto">
                                        <code
                                            className="hljs h-full outline-none block"
                                            contentEditable
                                            suppressContentEditableWarning
                                            onInput={(e) => {
                                                const updatedContent = e.target.innerText;
                                                handleFileChange(currentFile, updatedContent);
                                            }}
                                            onBlur={(e) => {
                                                const updatedContent = e.target.innerText;
                                                handleFileChange(currentFile, updatedContent);
                                                // Flush immediately on blur
                                                if (saveTimeoutRef.current) {
                                                    clearTimeout(saveTimeoutRef.current);
                                                    saveTimeoutRef.current = null;
                                                }
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: hljs.highlight(
                                                    fileTree[currentFile]?.file.contents || "",
                                                    { language: "javascript" }
                                                ).value,
                                            }}
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                minHeight: "100%",
                                            }}
                                        />
                                    </pre>
                                ) : (
                                    <div className="flex-grow h-full flex items-center justify-center text-gray-500 text-lg bg-gray-100">
                                        Select a file to view its content.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-grow h-full flex items-center justify-center text-gray-500 text-lg bg-gray-100 rounded-b-lg">
                                Select a file to view its content.
                            </div>
                        )}
                    </div>
                </div>

                {/* Iframe Preview */}
                {/* On mobile, this will stack below the code editor and take full screen height. */}
                {/* On large screens, it will be next to it, maintaining its desktop size. */}
                {(runError || (iframeUrl && webContainer)) && (
                    <div className="flex flex-col h-[calc(100vh-2rem)] lg:h-full w-full lg:min-w-[400px] lg:max-w-[50%] bg-gray-100 rounded-b-lg lg:rounded-r-lg lg:rounded-bl-none shadow-inner border-t lg:border-t-0 lg:border-l border-gray-300 relative">
                        {/* Error Section - Updated to match iframe styling */}
                        {runError && (
                            <div className="flex flex-col h-full w-full">
                                {/* Header Bar with Close Button */}
                                <div className="address-bar p-2 bg-slate-200 rounded-t-lg lg:rounded-tr-none shadow-sm flex justify-between items-center">
                                    <div className="text-gray-700 font-medium ml-2">Error</div>
                                    <button
                                        className="bg-white rounded-full p-1 shadow hover:bg-red-100 transition-colors"
                                        onClick={() => setRunError(null)}
                                        aria-label="Close Error"
                                    >
                                        <i className="ri-close-line text-xl text-gray-700 hover:text-red-600"></i>
                                    </button>
                                </div>

                                {/* Error Content */}
                                <div className="flex-grow bg-red-50 p-4 overflow-auto">
                                    <pre className="text-red-700 whitespace-pre-wrap text-sm">{runError}</pre>
                                </div>
                            </div>
                        )}

                        {iframeUrl && webContainer && (
                            <div className="flex flex-col h-full w-full">
                                {/* Header Bar with URL Input and Close Button */}
                                <div className="address-bar p-2 bg-slate-200 rounded-t-lg lg:rounded-tr-none shadow-sm flex justify-between items-center">
                                    <input
                                        type="text"
                                        onChange={(e) => setIframeUrl(e.target.value)}
                                        value={iframeUrl}
                                        className="w-full p-2 px-4 bg-white border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-400 text-sm mr-2"
                                        aria-label="Iframe URL"
                                    />
                                    <button
                                        className="bg-white rounded-full p-1 shadow hover:bg-red-100 transition-colors flex-shrink-0"
                                        onClick={() => setIframeUrl(null)}
                                        aria-label="Close Preview"
                                    >
                                        <i className="ri-close-line text-xl text-gray-700 hover:text-red-600"></i>
                                    </button>
                                </div>

                                {/* iFrame Content */}
                                <iframe
                                    src={iframeUrl}
                                    className="w-full h-full border-0 rounded-b-lg flex-grow"
                                    title="Project Preview"
                                ></iframe>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Custom CSS for scrollbar-hide */}
            <style>
                {`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                /* Basic markdown styling for AI messages */
                .markdown-body pre {
                    background-color: #1a202c !important; /* Dark background for code blocks */
                    padding: 1rem;
                    border-radius: 0.5rem;
                    overflow-x: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                .markdown-body code {
                    font-family: 'Fira Code', 'Cascadia Code', monospace;
                    font-size: 0.875rem; /* text-sm */
                    color: #e2e8f0; /* Light gray for code text */
                }
                .markdown-body p {
                    margin-bottom: 0.5rem;
                }
                .markdown-body ul, .markdown-body ol {
                    margin-left: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                .markdown-body li {
                    margin-bottom: 0.25rem;
                }
                .markdown-body strong {
                    font-weight: 600;
                }
                .markdown-body a {
                    color: #60a5fa; /* blue-400 */
                    text-decoration: underline;
                }
                `}
            </style>
        </main>
    );
};
