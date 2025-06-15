import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/js/bootstrap.bundle.js'
import { BrowserRouter } from "react-router-dom";
import  AppRoutes  from './Routes/Routes.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <BrowserRouter>
          <AppRoutes />
      </BrowserRouter>
  </StrictMode>,
)
