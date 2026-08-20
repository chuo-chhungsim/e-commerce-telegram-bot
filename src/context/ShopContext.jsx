//ShopContext
import { createContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { products } from '../assets/frontend_assets/assets';
import { toast } from 'react-toastify';
import { haptic, guardClosing } from '../telegram/tg';
import { storageGet, storageSet } from '../telegram/cloudStorage';

export const ShopContext = createContext();

/** Order numbers start here, so the first order of the demo is #1024. */
const FIRST_ORDER_NUMBER = 1024;

const ShopContextProvider = (props) => {
  const currency = '$';
  const delivery_fee = 10;

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [orders, setOrders] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const navigate = useNavigate();

  // Blocks the first save, so an empty cart cannot overwrite the stored one
  // before CloudStorage has answered.
  const hydratedRef = useRef(false);

  /* --------------------------------------------------- load saved state once */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedCart, savedOrders] = await Promise.all([
        storageGet('cart', {}),
        storageGet('orders', []),
      ]);
      if (cancelled) return;
      setCartItems(savedCart && typeof savedCart === 'object' ? savedCart : {});
      setOrders(Array.isArray(savedOrders) ? savedOrders : []);
      hydratedRef.current = true;
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------- persist on change */

  useEffect(() => {
    if (!hydratedRef.current) return;
    storageSet('cart', cartItems);
    // Ask Telegram to confirm before closing while there is something in the cart.
    guardClosing(Object.keys(cartItems).length > 0);
  }, [cartItems]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    storageSet('orders', orders);
  }, [orders]);

  /* ------------------------------------------------------------ cart actions */

  const addToCart = async (itemId, size) => {
    if (!size) {
      haptic.notify('error');
      toast.error('Please Select Product Size');
      return;
    }

    const cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      cartData[itemId][size] = (cartData[itemId][size] || 0) + 1;
    } else {
      cartData[itemId] = { [size]: 1 };
    }
    setCartItems(cartData);

    haptic.notify('success');
    toast.success('Added to cart');
  };

  const getCartCount = () => {
    let totalCount = 0;
    for (const itemId in cartItems) {
      for (const size in cartItems[itemId]) {
        if (cartItems[itemId][size] > 0) totalCount += cartItems[itemId][size];
      }
    }
    return totalCount;
  };

  const updateQuantity = async (itemId, size, quantity) => {
    const cartData = structuredClone(cartItems);
    if (!cartData[itemId]) return;

    if (quantity > 0) {
      cartData[itemId][size] = quantity;
    } else {
      delete cartData[itemId][size];
      if (Object.keys(cartData[itemId]).length === 0) delete cartData[itemId];
      haptic.impact('light');
    }

    setCartItems(cartData);
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const itemId in cartItems) {
      const itemInfo = products.find((product) => product._id === itemId);
      if (!itemInfo) continue;
      for (const size in cartItems[itemId]) {
        if (cartItems[itemId][size] > 0) totalAmount += itemInfo.price * cartItems[itemId][size];
      }
    }
    return totalAmount;
  };

  /** Flat list of cart lines joined with their product, ready for rendering. */
  const getCartLines = () => {
    const lines = [];
    for (const itemId in cartItems) {
      const product = products.find((item) => item._id === itemId);
      if (!product) continue;
      for (const size in cartItems[itemId]) {
        const quantity = cartItems[itemId][size];
        if (quantity > 0) lines.push({ _id: itemId, size, quantity, product });
      }
    }
    return lines;
  };

  const clearCart = () => setCartItems({});

  /* ---------------------------------------------------------------- orders */

  /** Next human-readable order number: #1024, #1025, … */
  const nextOrderNumber = () => FIRST_ORDER_NUMBER + orders.length;

  const addOrder = (order) => {
    // Bounded history: this is a demo, and cloud storage has a size limit.
    setOrders((previous) => [order, ...previous].slice(0, 20));
  };

  const value = {
    products,
    currency,
    delivery_fee,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    cartItems,
    hydrated,
    addToCart,
    getCartCount,
    updateQuantity,
    getCartAmount,
    getCartLines,
    clearCart,
    orders,
    addOrder,
    nextOrderNumber,
    navigate,
  };

  return <ShopContext.Provider value={value}>{props.children}</ShopContext.Provider>;
};

export default ShopContextProvider;
