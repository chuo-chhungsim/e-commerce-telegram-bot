import { createRoot } from 'react-dom/client'
// HashRouter instead of BrowserRouter: the same build is served as a plain web
// app and as a Telegram Mini App from static hosting, and '#' routes need no
// server rewrite rules (and survive the query string Telegram appends).
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import ShopContextProvider from './context/ShopContext.jsx'
import TelegramProvider from './telegram/TelegramProvider.jsx'

createRoot(document.getElementById('root')).render(
  <TelegramProvider>
    <HashRouter>
      <ShopContextProvider>
        <App />
      </ShopContextProvider>
    </HashRouter>
  </TelegramProvider>,
)
