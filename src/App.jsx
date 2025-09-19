import React from "react";
import Routes from "./Routes";
import { AuthProvider } from './contexts/AuthContext';

function App() {
  // Production version - AuthContext restored with fixes
  console.log('🎆 TestMaster App starting with fixed AuthContext...');

  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

export default App;