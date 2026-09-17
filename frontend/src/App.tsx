import React, { useState, useEffect} from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

interface HabitCardProps {
  name: string;
  streak: number;
}

function HabitCard({name, streak}: HabitCardProps) {
  return <p>{name} : {streak} day streak</p>
}

function HabitList() {
  const habits: HabitCardProps[] = [
    {name: "Nap", streak: 6},
    {name: "Read", streak: 23},
    {name: "Exercise", streak: 43}
  ]

  return (
    <div>
      {habits.map((habit) => ( 
        <HabitCard key={habit.name} name={habit.name} streak={habit.streak}/>
      ))}
    </div>
  )
}

interface Habit {
  name: string
  id: number
  frequency: string
  completed: boolean
}

interface HabitViewerProps {
  refreshTrigger: number;
  onHabitChanged: () => void;
}

function HabitViewer({refreshTrigger, onHabitChanged}: HabitViewerProps){
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHabits() {
      const token = localStorage.getItem("access_token")
      const response = await fetch("http://127.0.0.1:8000/habits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if(response.status === 401) {
        setError("You're not logged in.");
        return;
      }

      if(!response.ok) {
        setError("Something went wrong.");
        return;
      }

      const data = await  response.json();
      setHabits(data)
    }
    loadHabits();
  }, [refreshTrigger]);

  if (error !== null) {
    return <p>{error}</p>;
  }

  if (habits === null) {
    return <p>Loading...</p>;
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("access_token");
    const response = await fetch(`http://127.0.0.1:8000/habits/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`, 
      },
    });

    if (!response.ok) {
      console.log("Failed to delete, status:", response.status)
      return;
    }

    onHabitChanged();
  }

  return(
    <div>
      {habits.map((habit) => (
        <div key={habit.id}>
          <p>{habit.name}</p>
          <button onClick={()=>handleDelete(habit.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}

interface LoginFormProps {
  onLogin: () => void;    
}

function LoginForm({onLogin}: LoginFormProps) {
  const[username, setUsername] = useState("")
  const[password, setPassword] = useState("")

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const body = new URLSearchParams({username, password})
    const response = await fetch("http://127.0.0.1:8000/users/login", {
      method: "POST",
      body: body,
    });

    if (!response.ok) {
      console.log("Failed to login, status: ", response.status);
      return;
    }

    const data = await response.json();
    localStorage.setItem("access_token", data.access_token)

    onLogin();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}

function CreateHabitForm({ onCreated }: { onCreated: () => void}) {
  const[name, setName] = useState("");
  const[frequency, setFrequency] = useState("");

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    const response = await fetch("http://127.0.0.1:8000/habits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({name, frequency}),
    });

    if (!response.ok) {
      console.log("Failed to create habit, status:", response.status)
      return;
    }

    setName("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select value={frequency} onChange={(e)=>setFrequency(e.target.value)}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>
      <button type="submit">Create Habit</button>
    </form>
  );
}

function RegisterForm() {
  const[username, setUsername] = useState("");
  const[password, setPassword] = useState("");

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();

    const response = await fetch("http://127.0.0.1:8000/users/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({username, password})
    });

    if (!response.ok) {
      console.log("Failed:", response.status);
      return;
    }

    setUsername("");
    setPassword("");
  }

  return(
    <form onSubmit={handleSubmit}>
      <input 
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Register</button>
    </form>
  )
}

function Auth({ onLogin }: { onLogin: ()=> void}) {
  return(
     <div>
      <h1>Authorization page</h1>
      <LoginForm onLogin={onLogin} />
      <RegisterForm />
     </div>
  )
}

function Dashboard({
  refreshTrigger, onHabitChanged,
}: {
  refreshTrigger: number,
  onHabitChanged: () => void;
}) {
  return(
    <div>
      <h1>Dashboard page</h1>
      <HabitViewer
        refreshTrigger={refreshTrigger}
        onHabitChanged={onHabitChanged}
      />
      <CreateHabitForm onCreated={onHabitChanged} />
    </div>
  )
}

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleLogin() {
    setRefreshTrigger(refreshTrigger + 1);
  }
 
  return (
    <BrowserRouter>
      <div>
        <nav>
          <Link to ="/">Dashboard</Link>
          <Link to="/auth">Auth</Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                refreshTrigger={refreshTrigger}
                onHabitChanged={handleLogin}
              />
            }
          />

          <Route
            path="/auth"
            element={<Auth onLogin={handleLogin} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App