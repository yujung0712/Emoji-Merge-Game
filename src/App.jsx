// App.jsx

import GameCanvas from "./components/GameCanvas";

function App() {
  return (
    <div style={styles.container}>
     

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