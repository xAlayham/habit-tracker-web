import { useState } from 'react'

interface HabitCardProps {
  name: string;
  streak: number;
}

function HabitCard({name, streak}: HabitCardProps){
  return <p>{name}: {streak} day streak</p>
}

function App() {
  return (
    <div>
      <HabitCard name="nap" streak={6} />
      <HabitCard name="read" streak={20} />
    </div>
  )
}
export default App
