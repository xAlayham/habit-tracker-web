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

export default HabitList
