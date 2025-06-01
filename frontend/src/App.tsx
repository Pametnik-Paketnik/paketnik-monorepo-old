// src/App.tsx

import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './routes/Home.tsx'
import LoginPage from './routes/Login.tsx'
import SettingsPage from './routes/About.tsx'
import RegisterPage from './routes/Register.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}
