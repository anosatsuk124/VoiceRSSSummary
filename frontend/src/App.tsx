import React from 'react';
import './app/globals.css';
import RootLayout from './app/layout';
import Home from './app/page';

export default function App() {
  return (
    <RootLayout>
      <Home />
    </RootLayout>
  );
}
