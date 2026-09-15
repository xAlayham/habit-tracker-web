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
  version: string
}

function HabitViewer(){
  const [habit, setHabit] = useState<Habit | null>(null);

  useEffect(() => {
    async function loadHabit() {
      const response = await fetch("http://127.0.0.1:8000/")
      const data = await response.json();
      setHabit(data)
    }
    loadHabit();
  }, []);


    if (habit === null) {
      return <p>Loading...</p>
    }
    return(
      <div>
        <p>{habit.name}</p>
        <p>{habit.version}</p>
      </div>
    );
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