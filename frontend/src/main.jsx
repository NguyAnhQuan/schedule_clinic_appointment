/**
 * FILE_GUIDE: main.jsx — Điểm vào React, mount App vào #root
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Khởi tạo React 18 root và gắn cây component vào phần tử #root trong index.html.
 * StrictMode: chế độ dev giúp phát hiện side effect không an toàn (gọi effect 2 lần trong dev).
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
