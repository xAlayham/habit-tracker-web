import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(count+1)}>Complete today</button>
      <p>Current streak: {count}</p>
      {count % 5 === 0 && count > 0 ? <p>Milestone!</p> : null}
    </div>
  )
}
export default App
