import { useState } from 'react'
import './App.css'

function App() {
  const [todos, setTodos] = useState([{ text: "Todo kfdksd", done: false}, { text: "Todo 2", done: false}])
  const [input, setInput] = useState("")

  const addTodo = () => {
    if (input.trim() === "") return
    setTodos([...todos, { text: input, done: false }])
    setInput("")
  }

  const toggleTodo = (index) => {
    const newTodos = [...todos]
    newTodos[index].done = !newTodos[index].done
    setTodos(newTodos)
  }

  const deleteTodo = (index) => {
    setTodos(todos.filter((_, i) => i !== index))
  }

  return (
    <div style={styles.container}>
      <h1>📝 Min To-Do App</h1>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Vad ska du göra?"
      />
      <button onClick={addTodo}>Lägg till</button>

      <ul>
        {todos.map((todo, index) => (
          <li key={index}>
            <span
              onClick={() => toggleTodo(index)}
              style={todo.done ? styles.todoDone : styles.todoText}
            >
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(index)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  )
}


const styles = {
  container: {
    padding: 20,
  },
  todoText: {
    cursor: "pointer",
  },
  todoDone: {
    textDecoration: "line-through",
    color: "gray",
    cursor: "pointer",
  }
}


export default App
