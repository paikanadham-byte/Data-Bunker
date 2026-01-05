import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import SearchPage from './pages/SearchPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <nav className="navbar navbar-dark bg-dark sticky-top shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            🌍 Data Bunker
          </span>
          <p className="text-white-50 mb-0 small">
            Global Company Search Platform
          </p>
        </div>
      </nav>
      <SearchPage />
    </div>
  );
}

export default App;
