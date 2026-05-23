// App.jsx

import GameCanvas from "./components/GameCanvas";

function App() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>MergeChase</h1>

      <GameCanvas />
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#111",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "white",
  },

  title: {
    marginTop: "20px",
    marginBottom: "20px",
    fontSize: "40px",
  },
};

export default App;