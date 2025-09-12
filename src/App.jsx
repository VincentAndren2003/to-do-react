import { useState, useEffect } from "react";
import "./App.css";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import ListItem from "@mui/material/ListItem";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";

const dummyTodos = [
  { id: 1, text: "To do 1 example", done: false },
  { id: 2, text: "To do 2 example", done: true },
];

function App() {
  // active todos
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem("todos");
    return saved ? JSON.parse(saved) : [...dummyTodos];
  });

  // deleted todos
  const [deletedTodos, setDeletedTodos] = useState(() => {
    const saved = localStorage.getItem("deletedTodos");
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState("");

  // persist both lists
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("deletedTodos", JSON.stringify(deletedTodos));
  }, [deletedTodos]);

  const addTodo = () => {
    if (input.trim() === "") return;

    const newId =
      todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1;

    const newTodos = [...todos, { id: newId, text: input, done: false }];
    setTodos(newTodos);
    setInput("");
  };

  const toggleTodo = (index) => {
    const newTodos = [...todos];
    newTodos[index].done = !newTodos[index].done;
    setTodos(newTodos);
  };

  const deleteTodo = (index) => {
    const todoToDelete = todos[index];
    setTodos(todos.filter((_, i) => i !== index));
    setDeletedTodos([...deletedTodos, todoToDelete]);
  };

  const clearDeletedTodos = () => {
    setDeletedTodos([]);
  };

  // progress
  const completedTodos = todos.filter((todo) => todo.done).length;
  const totalTodos = todos.length;
  const progressPercentage =
    totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  return (
    <div style={styles.container}>
      <h1>Todos</h1>
      <h3>Create a todo below</h3>

      <label htmlFor="Tasks">
        Progress: {completedTodos}/{totalTodos} completed
      </label>
      <progress id="Tasks" max="100" value={progressPercentage}>
        {progressPercentage}%
      </progress>

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
        {todos.map((todo, index) => (
          <ListItem key={todo.id} style={todo.done ? styles.completedTodo : {}}>
            <ListItemText
              primary={todo.text}
              style={
                todo.done
                  ? { textDecoration: "line-through", opacity: 0.7 }
                  : {}
              }
            />
            <div style={styles.CTAs}>
              <Checkbox
                checked={todo.done}
                onChange={() => toggleTodo(index)}
              />
              <IconButton
                aria-label="delete"
                onClick={() => deleteTodo(index)}
              >
                <DeleteIcon sx={{ color: "red" }} />
              </IconButton>
            </div>
          </ListItem>
        ))}
      </List>

      {/* Deleted todos */}
      <h2>Deleted Todos</h2>
      <List>
        {deletedTodos.map((todo) => (
          <ListItem key={todo.id}>
            <ListItemText
              primary={todo.text}
              style={{ textDecoration: "line-through", opacity: 0.5 }}
            />
          </ListItem>
        ))}
      </List>
      <h4 onClick={clearDeletedTodos} style={{ cursor: "pointer" }}>
        Clear
      </h4>
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    color: "blue",
    maxWidth: 600,
    margin: "0 auto",
  },
  inputContainer: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  textField: {
    flex: 1,
  },
  todoText: {
    cursor: "pointer",
  },
  CTAs: {
    display: "flex",
    gap: "2px",
    alignItems: "center",
  },
  completedTodo: {
    backgroundColor: "#764949ff",
  },
};

export default App;
