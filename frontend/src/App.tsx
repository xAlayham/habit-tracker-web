import { useState, useEffect} from "react";

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

function HabitViewer(){
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
  }, []);

  if (error !== null) {
    return <p>{error}</p>;
  }

  if (habits === null) {
    return <p>Loading...</p>;
  }

  return(
    <div>
      {habits.map((habit) => (
        <p key={habit.id}>{habit.name}</p>
      ))}
    </div>
  )
}

function LoginForm() {
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

function App() {
  return (
    <div>
      <HabitList />
      <HabitViewer />
      <LoginForm />
    </div>
  )
}

export default App