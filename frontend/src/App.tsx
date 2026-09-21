import React, { useState, useEffect} from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import Coach from "./Coach";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

// FastAPI returns {detail: "..."} for raised HTTPExceptions but {detail: [...]}
// for 422 validation errors — rendering that array straight into JSX would crash,
// so anything that isn't a plain string falls back to a generic message.
function apiErrorMessage(detail: unknown, fallback: string): string {
  return typeof detail === "string" ? detail : fallback;
}

interface Habit {
  name: string
  id: number
  frequency: Frequency
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
                aria-pressed={habit.completed}
                aria-label={
                  habit.completed
                    ? `Mark ${habit.name} as not complete`
                    : `Mark ${habit.name} as complete`
                }
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
  // loadError replaces the whole list (nothing to show); actionError is a banner
  // above a list that's still perfectly valid, e.g. when one delete failed.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadHabits() {
      const token = localStorage.getItem("access_token")

      try {
        const response = await fetch(`${API_URL}/habits`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if(response.status === 401) {
          // token is missing or expired — drop it and send them back to login
          localStorage.removeItem("access_token");
          navigate("/login");
          return;
        }

        if(!response.ok) {
          setLoadError("Couldn't load your habits. Please try again.");
          return;
        }

        const data = await response.json();
        setHabits(data)
      } catch {
        setLoadError(
          "Can't reach the server. It may be waking up from sleep — wait a few seconds and refresh."
        );
      }
    }
    loadHabits();
  }, [refreshTrigger, navigate]);

  if (loadError !== null) {
    return <p className="status-message">{loadError}</p>;
  }

  if (habits === null) {
    return <p className="status-message">Loading…</p>;
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) {
      return;
    }

    setActionError(null);
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${API_URL}/habits/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setActionError("Couldn't delete that habit. Please try again.");
        return;
      }

      onHabitChanged();
    } catch {
      setActionError("Can't reach the server. Please try again in a moment.");
    }
  }

  async function handleComplete(id: number) {
    setActionError(null);
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${API_URL}/habits/${id}/complete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setActionError("Couldn't update that habit. Please try again.");
        return;
      }

      onHabitChanged();
    } catch {
      setActionError("Can't reach the server. Please try again in a moment.");
    }
  }

  if (habits.length === 0) {
    return <p className="status-message">No habits yet — add one with the button above.</p>;
  }

  const dailyHabits = habits.filter((habit) => habit.frequency === "daily");
  const weeklyHabits = habits.filter((habit) => habit.frequency === "weekly");
  const monthlyHabits = habits.filter((habit) => habit.frequency === "monthly");
  const yearlyHabits = habits.filter((habit) => habit.frequency === "yearly");

  return(
    <div className="habit-groups">
      {actionError !== null && <p className="form-error">{actionError}</p>}
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
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    const body = new URLSearchParams({username, password})

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        body: body,
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        setError(apiErrorMessage(failure?.detail, "Couldn't log in. Please try again."));
        return;
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token)

      onLogin();
      navigate("/");
    } catch {
      setError(
        "Can't reach the server. It may be waking up from sleep — wait a few seconds and try again."
      );
    }
  }

  return (
    <div className="card">
      <h2>Login</h2>
      <form className="form" onSubmit={handleSubmit}>
        {error !== null && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
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
  const[frequency, setFrequency] = useState<Frequency | "">("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);

    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({name, frequency}),
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        setError(apiErrorMessage(failure?.detail, "Couldn't create that habit. Please try again."));
        return;
      }

      setName("");
      onCreated();
    } catch {
      setError("Can't reach the server. Please try again in a moment.");
    }
  }

  return (
    <div className="card">
      <h2>New habit</h2>
      <form className="form" onSubmit={handleSubmit}>
        {error !== null && <p className="form-error">{error}</p>}
        <div className="field">
          <label htmlFor="habit-name">Habit name</label>
          <input
            id="habit-name"
            type="text"
            placeholder="e.g. Read for 20 minutes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="habit-frequency">Frequency</label>
          <select
            id="habit-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            required
          >
            <option value="" disabled>Select a frequency</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Create Habit</button>
      </form>
    </div>
  );
}

function RegisterForm() {
  const[username, setUsername] = useState("");
  const[password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({username, password})
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        setError(apiErrorMessage(failure?.detail, "Couldn't create your account. Please try again."));
        return;
      }

      setUsername("");
      setPassword("");
      setSuccess(true);
    } catch {
      setError(
        "Can't reach the server. It may be waking up from sleep — wait a few seconds and try again."
      );
    }
  }

  return(
    <div className="card">
      <h2>Register</h2>
      <form className="form" onSubmit={handleSubmit}>
        {error !== null && <p className="form-error">{error}</p>}
        {success && <p className="form-success">Account created — you can log in now.</p>}
        <div className="field">
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            type="text"
            placeholder="At least 3 characters"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
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
      <Coach />
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

  // Bumping this is what makes HabitViewer refetch — called after a login,
  // a habit is created, completed, or deleted.
  function handleRefresh() {
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
                onHabitChanged={handleRefresh}
                />
              </RequireLogin>
            }
          />

          <Route
            path="/login"
            element={<LoginPage onLogin={handleRefresh} />}
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