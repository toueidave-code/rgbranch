import Header from './components/Header.js';
import './style.css';

function App() {
  return (
    <div className="app-container bg-theme-background dark:bg-darkTheme-background min-h-screen text-theme-text-primary dark:text-darkTheme-text-primary antialiased">
      <Header />
    </div>
  );
}

export default App;
