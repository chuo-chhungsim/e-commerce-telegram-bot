import { useEffect } from "react"
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import Home from "./pages/Home"
import Collection from "./pages/Collection"
import About from './pages/About';
import Contact from './pages/Contact';
import Product from './pages/Product';
import Cart from "./pages/Cart";
import Profile from './pages/Profile';
import PlaceOrder from './pages/PlaceOrder';
import Orders from './pages/Orders';
import Navbar from './components/navbar';
import Footer from "./components/Footer";
import SearchBar from './components/SearchBar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useBackButton } from './telegram/useTelegramButtons';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Inside Telegram, the native back button pops the history stack on every
  // screen except the home page. It does nothing in a normal browser.
  useBackButton(() => navigate(-1), location.pathname !== '/');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <>
      <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]">
        <ToastContainer position="top-center" autoClose={2000} hideProgressBar newestOnTop />
        <Navbar/>
        <SearchBar/>
        <Routes>

          <Route path="/" element={<Home/>}/>
          <Route path="/collection" element={<Collection/>} />
          <Route path="/about" element={<About/>} />
          <Route path="/contact" element={<Contact/>} />
          <Route path="/product/:productId" element={<Product/>} />
          <Route path="/cart" element={<Cart/>}/>
          <Route path="/profile" element={<Profile/>}/>
          <Route path="/place-order" element={<PlaceOrder/>}/>
          <Route path="/orders" element={<Orders/>}/>
          {/* Telegram appends its own parameters to the start URL. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer/>
      </div>    
    </>
  )
}

export default App
