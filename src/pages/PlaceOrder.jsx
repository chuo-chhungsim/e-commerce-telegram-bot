//PlaceOrder.jsx
import { useContext, useState } from "react";
import { assets } from "../assets/frontend_assets/assets";
import CartTotal from "../components/CartTotal";
import Title from "../components/Title";
import { ShopContext } from "../context/ShopContext";
import { useTelegram } from "../telegram/TelegramProvider";
import { haptic, showPopup } from "../telegram/tg";
import { submitOrder } from "../lib/api";
import { toast } from "react-toastify";

const PlaceOrder = () => {
  const [method,setMethod] = useState("cod");
  const [submitting,setSubmitting] = useState(false);
  const {navigate, currency, delivery_fee, getCartAmount, getCartLines, clearCart, addOrder, nextOrderNumber} = useContext(ShopContext);
  const { user } = useTelegram();

  // The Telegram profile fills in the name, so there is no signup step.
  const [form,setForm] = useState({
    firstName: user?.first_name ?? '',
    lastName: user?.last_name ?? '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    phone: '',
  });

  const onChange = (field) => (event) => setForm((current)=>({...current,[field]: event.target.value}));

  const lines = getCartLines();
  const total = getCartAmount() + (lines.length ? delivery_fee : 0);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (lines.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setSubmitting(true);

    const order = {
      id: `#${nextOrderNumber()}`,
      createdAt: new Date().toISOString(),
      status: 'Processing',
      paymentMethod: method,
      customer: form,
      items: lines.map((line)=>({
        id: line._id,
        name: line.product.name,
        size: line.size,
        quantity: line.quantity,
        price: line.product.price,
        image: line.product.image[0],
      })),
      shipping: delivery_fee,
      total,
      currency,
    };

    try {
      const result = await submitOrder(order);
      addOrder({ ...order, synced: result.mode === 'backend' });
      clearCart();
      haptic.notify('success');

      // sendData closes the Mini App by itself, so there is nothing left to show.
      if (result.mode === 'sendData') return;

      await showPopup({
        title: `Order ${order.id} Confirmed`,
        message: `Total: ${currency}${total}\nStatus: Processing\n\n${
          result.mode === 'backend'
            ? 'A confirmation has been sent to your Telegram chat.'
            : 'This order is saved on this device.'
        }`,
        buttons: [{ type: 'ok' }],
      });
      toast.success(`Order ${order.id} confirmed`);
      navigate('/orders', { replace: true });
    } catch (error) {
      haptic.notify('error');
      toast.error(`Could not place the order: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmitHandler}>
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t">
        {/* Left Side */}
        <div className="flex flex-col gap-4 sm:max-w-[480px]">
          <div className="text-xl sm:text-2xl my-3">
            <Title text1={"Delivery"} text2={"INFORMATION"}/>
          </div>
          <div className="flex gap-3">
            <input required value={form.firstName} onChange={onChange('firstName')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="First name"/>            
            <input value={form.lastName} onChange={onChange('lastName')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Last name"/>
          </div>
          <input required value={form.email} onChange={onChange('email')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="email" placeholder="Email address"/>
          <input required value={form.street} onChange={onChange('street')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Street"/>
          <div className="flex gap-3">
            <input required value={form.city} onChange={onChange('city')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="City"/>            
            <input value={form.state} onChange={onChange('state')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="State"/>
          </div>
          <div className="flex gap-3">
            <input value={form.zipcode} onChange={onChange('zipcode')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Zipcode"/>            
            <input value={form.country} onChange={onChange('country')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Country"/>
          </div>
          <input required value={form.phone} onChange={onChange('phone')} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="tel" placeholder="Phone number"/>
        </div>
        {/* Right Side */}
        <div className="mt-8">
          <div className="mt-8 min-w-80">
            <CartTotal />
          </div>
          <div className="mt-12">
            <Title text1={"payment"} text2={'method'}/>
            {/* Payment Selection */}
            <div className="flex gap-3 flex-col lg:flex-row">
              <div onClick={()=>setMethod('stripe')} className="flex items-center gap-3 border p-2 px-3 cursor-pointer">
                <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'stripe' ? 'bg-green-500' : ''}`}></p>
                <img className="h-5 mx-4" src={assets.stripe_logo} alt="" />
              </div>
              <div onClick={()=>setMethod('razorpay')} className="flex items-center gap-3 border p-2 px-3 cursor-pointer">
                <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'razorpay' ? 'bg-green-500' : ''}`}></p>
                <img className="h-5 mx-4" src={assets.razorpay_logo} alt="" />
              </div>
              <div onClick={()=>setMethod('cod')} className="flex items-center gap-3 border p-2 px-3 cursor-pointer">
                <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'cod' ? 'bg-green-500' : ''}`}></p>
                <p className="uppercase text-gray-600 text-sm font-medium mx-4">Cash on Delivery</p>
              </div>
              
            </div>
            <div className="w-full text-end mt-8 ">
              <button type="submit" disabled={submitting} className="uppercase text-sm bg-black text-white px-16 py-5 rounded disabled:opacity-60">
                {submitting ? 'placing order…' : 'place order'}
              </button>
              <p className="mt-3 text-xs text-gray-400">School demo — no real payment is taken.</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
