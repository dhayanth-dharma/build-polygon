import logo from './logo.svg';
import './App.css';
import React, { useState } from 'react';

import ThreeScene from './components/ThreeScene';

import { div } from 'three/webgpu';

function App() {
  return (
    <div>
      <ThreeScene />
    </div>

  );
}

export default App;
