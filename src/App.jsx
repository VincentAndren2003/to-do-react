import { useState, useEffect, useRef } from "react";
import "./App.css";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import ListItem from "@mui/material/ListItem";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { motion, useSpring, useScroll } from "motion/react";
import { TransitionGroup } from "react-transition-group";
import Collapse from "@mui/material/Collapse";
import Snackbar from '@mui/material/Snackbar';
import CloseIcon from "@mui/icons-material/Close";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { styled } from '@mui/material/styles';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

// Firestore imports
import { db } from "./firebase";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  where,
} from "firebase/firestore";

function App() {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [allDoneSnackbarOpen, setAllDoneSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // state now comes from Firestore
  const [todos, setTodos] = useState([]);
  const [deletedTodos, setDeletedTodos] = useState([]);
  const [doneTodos, setDoneTodos] = useState([]);
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { scrollYProgress } = useScroll(); // Scroll animation from motion
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // realtime listener: subscribe to todos collection and split lists
  useEffect(() => {
    // if no user, clear lists and don't subscribe
    if (!user) {
      setTodos([]);
      setDoneTodos([]);
      setDeletedTodos([]);
      return;
    }

    const q = query(
      collection(db, "todos"),
      where("userId", "==", user.uid),
      orderBy("created_at", "desc")
    );
    // includeMetadataChanges ensures local (pending) writes trigger the listener
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTodos(items.filter((t) => !t.done && !t.deleted));
        setDoneTodos(items.filter((t) => t.done && !t.deleted));
        setDeletedTodos(items.filter((t) => t.deleted));
      },
      (err) => console.error("Firestore onSnapshot error:", err)
    );
    return unsubscribe;
  }, [user]);

  // Add a state for the current time to trigger re-renders
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef();

  // Start a timer that updates every second
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Listen for auth state changes and try anonymous sign-in if none
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    if (!auth.currentUser) {
      // optional: silently sign in anonymously so users can use the app without explicit sign-up
      signInAnonymously(auth).catch(() => {});
    }
    return unsub;
  }, []);

  // Email/password handlers
  const signUpEmail = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setSnackbarMessage("Signed up successfully");
      setSnackbarOpen(true);
      setEmail("");
      setPassword("");
    } catch (e) {
      console.error("Sign-up error", e);
      setSnackbarMessage(e.message || "Sign-up failed");
      setSnackbarOpen(true);
    }
  };

  const signInEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setSnackbarMessage("Signed in");
      setSnackbarOpen(true);
      setEmail("");
      setPassword("");
    } catch (e) {
      console.error("Sign-in error", e);
      setSnackbarMessage(e.message || "Sign-in failed");
      setSnackbarOpen(true);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Google sign-in failed:", e);
      setSnackbarMessage("Sign-in failed");
      setSnackbarOpen(true);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      // optionally re-enable anonymous session
      await signInAnonymously(auth).catch(() => {});
    } catch (e) {
      console.error("Sign-out failed:", e);
    }
  };

  // When adding a todo, create doc in Firestore with 5h deadline
  const addTodo = async () => {
    if (input.trim() === "") return;
    if (!user) {
      setSnackbarMessage("Please sign in to save todos.");
      setSnackbarOpen(true);
      return;
    }
    const deadline = Date.now() + 5 * 60 * 60 * 1000; // 5 hours from now

    // optimistic local update so UI shows the new todo immediately
    const tempTodo = {
      id: `local-${Date.now()}`,
      text: input,
      done: false,
      deleted: false,
      deadline,
      created_at: Date.now(),
      userId: user.uid,
    };
    setTodos((prev) => [tempTodo, ...prev]);

    try {
      await addDoc(collection(db, "todos"), {
        text: input,
        done: false,
        deleted: false,
        deadline,
        created_at: Date.now(),
        userId: user.uid,
      });
      setInput("");
    } catch (e) {
      console.error("Failed to add todo:", e);
      setSnackbarMessage("Failed to add todo");
      setSnackbarOpen(true);
    }
  };

  // Helper to format remaining time
  function formatTime(ms) {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }

  // complete by todo object
  const completeTodo = async (todo) => {
    if (!todo) return;

    // optimistic update: remove from active list and add to done list immediately
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    setDoneTodos((prev) => [{ ...todo, done: true }, ...prev]);
    setSnackbarMessage(`${todo.text} Completed, Good Job!`);
    setSnackbarOpen(true);

    // if it's a local optimistic item there's nothing to persist
    if (String(todo.id).startsWith("local-")) return;

    // persist change to Firestore; rollback on failure
    try {
      await updateDoc(doc(db, "todos", todo.id), { done: true });
    } catch (e) {
      console.error("Failed to complete todo:", e);
      // rollback optimistic change
      setDoneTodos((prev) => prev.filter((t) => t.id !== todo.id));
      setTodos((prev) => [todo, ...prev]);
      setSnackbarMessage("Failed to mark todo complete");
      setSnackbarOpen(true);
    }
  };
  
  // delete by todo object (soft delete). Handles optimistic local items.
  const deleteTodo = async (todo) => {
    if (!todo) return;

    // optimistic update: remove from active list and add to deleted list immediately
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    setDeletedTodos((prev) => [{ ...todo, deleted: true }, ...prev]);
    setSnackbarMessage("Todo deleted.");
    setSnackbarOpen(true);

    // if it's a local optimistic item there's nothing to persist
    if (String(todo.id).startsWith("local-")) return;

    // persist change to Firestore; rollback on failure
    try {
      await updateDoc(doc(db, "todos", todo.id), { deleted: true });
    } catch (e) {
      console.error("Failed to delete todo:", e);
      // rollback optimistic change
      setDeletedTodos((prev) => prev.filter((t) => t.id !== todo.id));
      setTodos((prev) => [todo, ...prev]);
      setSnackbarMessage("Failed to delete todo (saved locally)");
      setSnackbarOpen(true);
    }
  };
  
  const clearDeletedTodos = async () => {
    try {
      const toRemove = [...deletedTodos];
      await Promise.all(toRemove.map((t) => deleteDoc(doc(db, "todos", t.id))));
    } catch (e) {
      console.error("Failed to clear deleted todos:", e);
    }
  };

  // progress
  // Calculate total todos (active + done)


  const clearDoneTodos = async () => {
    if (doneTodos.length === 0) return;
    const toRemove = [...doneTodos];

    // optimistic UI update: remove from view immediately
    setDoneTodos([]);

    try {
      // only attempt to delete docs that exist remotely (not local optimistic items)
      const remote = toRemove.filter((t) => !String(t.id).startsWith("local-"));
      await Promise.all(remote.map((t) => deleteDoc(doc(db, "todos", t.id))));
    } catch (e) {
      console.error("Failed to clear done todos:", e);
      // rollback UI and notify user
      setDoneTodos(toRemove);
      setSnackbarMessage("Failed to clear done todos");
      setSnackbarOpen(true);
    }
  };
  
  const totalTodos = todos.length + doneTodos.length;
  const completedTodos = doneTodos.length;
  const progressPercentage =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // reusable todo renderer (unchanged)
  const renderTodoItem = (todo, index, isDone = false) => {
    const remaining = todo.deadline ? todo.deadline - now : 0;
    return (
      <ListItem
        key={todo.id}
        style={{
          border: "2px solid #4698e4",
          borderRadius: "12px",
          padding: "10px 15px",
          marginBottom: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: todo.done ? "#5db1ff20" : "white",
        }}
      >
        <ListItemText
          primary={
            <span>
              {todo.text}
              {!isDone && (
                <span style={{ marginLeft: 12, color: "#1a90ff", fontWeight: 500, fontSize: 14 }}>
                  ⏰ {formatTime(remaining)}
                </span>
              )}
            </span>
          }
          style={{
            textDecoration: todo.done ? "line-through" : "none",
            opacity: todo.done ? 0.7 : 1,
          }}
        />
        {!isDone && (
          <div style={styles.CTAs}>
            <Checkbox checked={!!todo.done} onChange={() => completeTodo(todo)} />
            <IconButton aria-label="delete" onClick={() => deleteTodo(todo)}>
              <DeleteIcon sx={{ color: "red" }} />
            </IconButton>
          </div>
        )}
      </ListItem>
    );
  };

  useEffect(() => {
    if (todos.length === 0 && doneTodos.length > 0) {
      setAllDoneSnackbarOpen(true);
    }
  }, [todos, doneTodos]);

  return (
    <>
      {/* Auth controls (Email/Password + optional Google) */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 8 }}>
        {user ? (
          <>
            <div style={{ alignSelf: "center", fontSize: 14, opacity: 0.85 }}>
              {user.isAnonymous ? "Guest" : user.displayName || user.email}
            </div>
            <Button
              variant="outlined"
              onClick={signOutUser}
              sx={{
                backgroundColor: "#fff",
                color: "#222",
                borderColor: "#ddd",
                "&:hover": { backgroundColor: "#f2f2f2" },
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <TextField
                size="small"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                variant="outlined"
                sx={{
                  "& .MuiInputBase-root": {
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                  },
                }}
              />
              <TextField
                size="small"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                variant="outlined"
                sx={{
                  "& .MuiInputBase-root": {
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                  },
                }}
              />
              <Button variant="contained" onClick={signInEmail}>Sign in</Button>
              <Button variant="outlined" onClick={signUpEmail}>Sign up</Button>
              <Button variant="contained" onClick={signInWithGoogle} sx={{ ml: 1 }}>
                Google
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Scroll progress bar */}
      <motion.div
        id="scroll-indicator"
        style={{
          scaleX,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          transformOrigin: "0%",
          backgroundColor: "#ff0088",
          zIndex: 1000,
        }}
      />

      <div style={styles.container}>
        <h1>Todos</h1>
        <h3>Create a todo below</h3>

        {/* Minimal, rounded progress bar */}
        <div style={{ margin: "24px 0" }}>
          <BorderLinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ width: "100%" }}
          />
        </div>

        <div style={styles.inputContainer}>
          <TextField
            id="standard-basic"
            placeholder="Vad ska du göra?"
            variant="standard"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTodo()}
            style={styles.textField}
          />
          <Button color="primary" variant="contained" onClick={addTodo}>
            Lägg till
          </Button>
        </div>

        {/* Active todos */}
        <h2>Active Todos</h2>
        <List>
          <TransitionGroup>
            {todos.map((todo, index) => (
              <Collapse key={todo.id}>{renderTodoItem(todo, index)}</Collapse>
            ))}
          </TransitionGroup>
        </List>

        {/* Deleted todos */}
        {deletedTodos.length > 0 && (
          <>
            <h2>Deleted Todos</h2>
            <List>
              <TransitionGroup>
                {deletedTodos.map((todo, index) => (
                  <Collapse key={todo.id}>
                    {renderTodoItem(todo, index, true)}
                  </Collapse>
                ))}
              </TransitionGroup>
            </List>
            <Button
              onClick={clearDeletedTodos}
              variant="outlined"
              style={{ cursor: "pointer", margin: "10px 0" }}
            >
              Clear Deleted Todos
            </Button>
          </>
        )}

        {/* Done todos */}
        {doneTodos.length > 0 && (
          <>
            <h2>Done Todos</h2>
            <List>
              <TransitionGroup>
                {doneTodos.map((todo, index) => (
                  <Collapse key={todo.id}>
                    {renderTodoItem(todo, index, true)}
                  </Collapse>
                ))}
              </TransitionGroup>
            </List>
            <Button
              onClick={clearDoneTodos}
               variant="outlined"
               style={{ cursor: "pointer", margin: "10px 0" }}
             >
               Clear Done Todos
             </Button>
          </>
        )}
      </div>

      <div style={styles.spacer}>
        <div>
          <Content />
        </div>
      </div>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={(event, reason) => {
          if (reason !== "clickaway") setSnackbarOpen(false);
        }}
        message={snackbarMessage}
        sx={{
          "& .MuiSnackbarContent-root": {
            background: "#43e97b",
            color: "#fff",
            borderRadius: "16px",
            fontSize: "1rem",
            minHeight: 48,
            minWidth: 200,
          },
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Snackbar
        open={allDoneSnackbarOpen}
        autoHideDuration={4000}
        onClose={() => setAllDoneSnackbarOpen(false)}
        message={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EmojiEventsIcon sx={{ fontSize: 28, color: "#fff700" }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              Congratulations!
            </span>
            <span style={{ fontWeight: 400, fontSize: 14 }}>
              All todos completed!
            </span>
          </span>
        }
        sx={{
          "& .MuiSnackbarContent-root": {
            background: "linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)",
            color: "#222",
            borderRadius: "24px",
            boxShadow: "0 4px 24px rgba(67,233,123,0.18)",
            fontSize: "1rem",
            minHeight: 48,
            minWidth: 180,
            maxWidth: "90vw", // Responsive for mobile
            justifyContent: "center",
            px: 1.5,
          },
        }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        action={
          <IconButton
            size="medium"
            aria-label="close"
            onClick={() => setAllDoneSnackbarOpen(false)}
            sx={{
              borderRadius: "999px",
              background: "#fff",
              color: "#43e97b",
              px: 2,
              mx: 1,
              boxShadow: "0 1px 4px rgba(67,233,123,0.12)",
              "&:hover": {
                background: "#e6ffe6",
              },
            }}
          >
            <CloseIcon fontSize="medium" />
          </IconButton>
        }
      />
    </>
  );
}

const styles = {
  container: {
    padding: "24px",
    color: "#22223b",
    fontFamily: "Inter, Helvetica, Arial, sans-serif",
    background: "#fff",
    maxWidth: 480,
    margin: "32px auto",
    borderRadius: "18px",
    boxShadow: "0 2px 16px rgba(34,34,59,0.06)",
    textAlign: "center",
    border: "1px solid #e0e0e0",
  },
  inputContainer: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  content: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "20px",
    fontFamily: "inherit",
    textAlign: "center",
    color: "#22223b",
    backgroundColor: "#f7f7f9",
    borderRadius: "12px",
    border: "1px solid #e0e0e0",
  },
  textField: {
    flex: 1,
    background: "#f7f7f9",
    borderRadius: "8px",
  },
  CTAs: {
    display: "flex",
    gap: "2px",
    alignItems: "center",
  },
  completedTodo: {
    backgroundColor: "#e9f5ec",
  },
  spacer: {
    marginTop: "50px",
  },
};

function Content() {
  return (
    <article style={styles.content}>
      <h2>Read more about my Projects!</h2>
      <p>
        I have worked on a variety of projects ranging from web applications to
        mobile apps. My focus has always been on creating user-friendly
        interfaces and ensuring optimal performance.
      </p>
      One of my notable projects includes a task management app that helps
      users organize their daily activities efficiently. I utilized React for
      the frontend and Node.js for the backend, ensuring a seamless user
      experience.
      <p>
        In addition to web development, I have also ventured into mobile app
        development using React Native. This has allowed me to create cross-platform
        applications that run smoothly on both iOS and Android devices.
      </p>
      <p>
        I am passionate about learning new technologies and continuously improving
        my skills. I believe that staying updated with the latest trends in
        technology is crucial for delivering high-quality projects.
      </p>
      <p>
        Feel free to reach out if you would like to collaborate on a project or
        if you have any questions about my work!
      </p>
    </article>
  );
}

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[200],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: '#1a90ff',
  },
}));

export default App;
