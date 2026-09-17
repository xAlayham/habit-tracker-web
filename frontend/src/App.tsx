import React, { useState, useEffect} from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import "./App.css";

interface Habit {
  name: string
  id: number
  frequency: string
  completed: boolean
  streak_count: number
  last_completed_date: string | null
}

interface HabitViewerProps {
  refreshTrigger: number;
  onHabitChanged: () => void;
}

function HabitGroup({
  title,
  habits,
  onDelete,
  onComplete,
}: {
  title: string;
  habits: Habit[];
  onDelete: (id: number) => void;
  onComplete: (id: number) => void;
}) {
  if (habits.length === 0) {
    return null;
  }

  return (
    <div className="habit-group">
      <h3 className="habit-group-title">{title}</h3>
      <div className="habit-list">
        {habits.map((habit) => (
          <div className={habit.completed ? "habit-card habit-card-done" : "habit-card"} key={habit.id}>
            <div className="habit-card-main">
              <button
                className={habit.completed ? "check-btn check-btn-done" : "check-btn"}
                onClick={() => onComplete(habit.id)}
                aria-label="Toggle complete"
              >
                {habit.completed ? "✓" : ""}
              </button>
              <p>{habit.name}</p>
              <span className="badge">{habit.frequency}</span>
              {habit.streak_count > 0 && (
                <span className="badge badge-streak">streak {habit.streak_count}</span>
              )}
            </div>
            <button className="btn btn-danger" onClick={() => onDelete(habit.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
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
    return <p className="status-message">{error}</p>;
  }

  if (habits === null) {
    return <p className="status-message">Loading...</p>;
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

  async function handleComplete(id: number) {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`http://127.0.0.1:8000/habits/${id}/complete`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log("Failed to update completion, status:", response.status);
      return;
    }

    onHabitChanged();
  }

  if (habits.length === 0) {
    return <p className="status-message">No habits yet — add one below.</p>;
  }

  const dailyHabits = habits.filter((habit) => habit.frequency === "daily");
  const weeklyHabits = habits.filter((habit) => habit.frequency === "weekly");
  const monthlyHabits = habits.filter((habit) => habit.frequency === "monthly");
  const yearlyHabits = habits.filter((habit) => habit.frequency === "yearly");

  return(
    <div className="habit-groups">
      <HabitGroup title="Daily" habits={dailyHabits} onDelete={handleDelete} onComplete={handleComplete} />
      <HabitGroup title="Weekly" habits={weeklyHabits} onDelete={handleDelete} onComplete={handleComplete} />
      <HabitGroup title="Monthly" habits={monthlyHabits} onDelete={handleDelete} onComplete={handleComplete} />
      <HabitGroup title="Yearly" habits={yearlyHabits} onDelete={handleDelete} onComplete={handleComplete} />
    </div>
  )
}

interface LoginFormProps {
  onLogin: () => void;    
}

function LoginForm({onLogin}: LoginFormProps) {
  const[username, setUsername] = useState("")
  const[password, setPassword] = useState("")
  const navigate = useNavigate();

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
    navigate("/");
  }

  return (
    <div className="card">
      <h2>Login</h2>
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Login</button>
      </form>
      <p className="switch-link">
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
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
    <div className="card">
      <h2>New habit</h2>
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Habit name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={frequency} onChange={(e)=>setFrequency(e.target.value)}>
          <option value="" disabled>Frequency</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <button className="btn btn-primary" type="submit">Create Habit</button>
      </form>
    </div>
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
    <div className="card">
      <h2>Register</h2>
      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Register</button>
      </form>
      <p className="switch-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  return (
    <button className="btn btn-logout" onClick={handleLogout}>
      Logout
    </button>
  );
}

function NewHabitDropdown({ onCreated }: { onCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdown">
      <button className="btn btn-primary" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close" : "+ New Habit"}
      </button>
      {isOpen && <CreateHabitForm onCreated={onCreated} />}
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="page">
      <h1 className="page-title">Welcome back</h1>
      <LoginForm onLogin={onLogin} />
    </div>
  );
}

function RegisterPage() {
  return (
    <div className="page">
      <h1 className="page-title">Create an account</h1>
      <RegisterForm />
    </div>
  );
}

function Dashboard({
  refreshTrigger, onHabitChanged,
}: {
  refreshTrigger: number,
  onHabitChanged: () => void;
}) {
  return(
    <div className="page">
      <div className="dashboard-page">
        <h1 className="page-title">Your habits</h1>
        <NewHabitDropdown onCreated={onHabitChanged} />
        <HabitViewer
          refreshTrigger={refreshTrigger}
          onHabitChanged={onHabitChanged}
        />
      </div>
    </div>
  )
}

function RequireLogin({children}: {children: React.ReactNode}) {
  const isLogin = localStorage.getItem("access_token")

  if(isLogin === null) {
    return <Navigate to="/login" />;
  }

  return children;
} 

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleLogin() {
    setRefreshTrigger(refreshTrigger + 1);
  }
 
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <Link to ="/">Dashboard</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <LogoutButton />
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <RequireLogin>
                <Dashboard
                refreshTrigger={refreshTrigger}
                onHabitChanged={handleLogin}
                />
              </RequireLogin>
            }
          />

          <Route
            path="/login"
            element={<LoginPage onLogin={handleLogin} />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App