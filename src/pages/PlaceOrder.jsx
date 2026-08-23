//PlaceOrder.jsx
import { useContext, useState } from "react";
import { QrCode, Landmark, Banknote } from "lucide-react";
import CartTotal from "../components/CartTotal";
import Title from "../components/Title";
import PaymentSheet from "../components/PaymentSheet";
import { ShopContext } from "../context/ShopContext";
import { useTelegram } from "../telegram/TelegramProvider";
import { haptic, showPopup } from "../telegram/tg";
import { submitOrder } from "../lib/api";
import { toast } from "react-toastify";

const PAYMENT_METHODS = [
  { id: 'khqr', icon: QrCode, label: 'KHQR', note: 'Scan to pay with any bank' },
  { id: 'aba', icon: Landmark, label: 'ABA Pay', note: 'Scan with the ABA app' },
  { id: 'cod', icon: Banknote, label: 'Cash on delivery', note: 'Pay when it arrives' },
];

const PlaceOrder = () => {
  const [method, setMethod] = useState("khqr");
  const [submitting, setSubmitting] = useState(false);
  const [payingFor, setPayingFor] = useState(null); // the order awaiting payment
  const { navigate, currency, delivery_fee, getCartAmount, getCartLines, clearCart, addOrder, nextOrderNumber } =
    useContext(ShopContext);
  const { user } = useTelegram();

  // The Telegram profile fills in the name, so there is no signup step.
  const [form, setForm] = useState({
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    phone: '',
    address: '',
  });

  const onChange = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const lines = getCartLines();
  const total = getCartAmount() + (lines.length ? delivery_fee : 0);

  /** Build the order from the cart and the form. */
  const draftOrder = () => ({
    id: `#${nextOrderNumber()}`,
    createdAt: new Date().toISOString(),
    status: 'Processing',
    paymentMethod: method,
    customer: form,
    items: lines.map((line) => ({
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
  });

  /** Send the order to the bot, store it, empty the cart, confirm. */
  const placeOrder = async (order) => {
    setSubmitting(true);
    try {
      const result = await submitOrder(order);
      addOrder({ ...order, synced: result.mode === 'backend' });
      clearCart();
      haptic.notify('success');

      // sendData closes the Mini App by itself, so there is nothing left to show.
      if (result.mode === 'sendData') return;

      await showPopup({
        title: `Order ${order.id} Confirmed`,
        message: `Total: ${currency}${order.total}\nStatus: Processing\n\n${
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
      setPayingFor(null);
    }
  };

  const onSubmitHandler = (event) => {
    event.preventDefault();
    if (submitting) return;
    if (lines.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const order = draftOrder();
    // Cash on delivery skips the payment step entirely.
    if (method === 'cod') placeOrder(order);
    else setPayingFor(order);
  };

  return (
    <form onSubmit={onSubmitHandler}>
      <div className="flex flex-col sm:flex-row justify-between gap-8 pt-5 sm:pt-14 min-h-[70vh] border-t">
        {/* Left Side — delivery */}
        <div className="flex flex-col gap-4 sm:max-w-[480px] w-full">
          <div className="text-xl sm:text-2xl my-3">
            <Title text1={"Delivery"} text2={"INFORMATION"} />
          </div>
          <input required value={form.name} onChange={onChange('name')} className="border border-gray-300 rounded py-2 px-3.5 w-full" type="text" placeholder="Full name" />
          <input required value={form.phone} onChange={onChange('phone')} className="border border-gray-300 rounded py-2 px-3.5 w-full" type="tel" placeholder="Phone number" />
          <textarea required value={form.address} onChange={onChange('address')} className="border border-gray-300 rounded py-2 px-3.5 w-full min-h-24 resize-none" placeholder="Delivery address" />
        </div>

        {/* Right Side — totals and payment */}
        <div className="w-full sm:max-w-[420px]">
          <div className="mt-8 min-w-80">
            <CartTotal />
          </div>

          <div className="mt-12">
            <Title text1={"payment"} text2={'method'} />
            <div className="flex flex-col gap-3">
              {PAYMENT_METHODS.map((payment) => {
                const Icon = payment.icon;
                const active = method === payment.id;
                return (
                  <button
                    type="button"
                    key={payment.id}
                    onClick={() => {
                      haptic.select();
                      setMethod(payment.id);
                    }}
                    className={`flex items-center gap-3 border p-3 text-left transition-colors ${
                      active ? 'border-black bg-gray-50' : 'border-gray-300'
                    }`}
                  >
                    <span className={`min-w-3.5 h-3.5 rounded-full border ${active ? 'bg-green-500' : ''}`} />
                    <Icon size={20} strokeWidth={1.75} className="text-gray-700" />
                    <span className="flex-1">
                      <span className="block text-sm text-gray-800">{payment.label}</span>
                      <span className="block text-xs text-gray-400">{payment.note}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full text-end mt-8">
              <button type="submit" disabled={submitting} className="uppercase text-sm bg-black text-white px-16 py-4 rounded disabled:opacity-60">
                {submitting
                  ? 'placing order…'
                  : method === 'cod'
                    ? 'place order'
                    : `pay ${currency}${total}`}
              </button>
              <p className="mt-3 text-xs text-gray-400">School demo — no real payment is taken.</p>
            </div>
          </div>
        </div>
      </div>

      <PaymentSheet
        open={Boolean(payingFor)}
        method={method}
        amount={total}
        currency="USD"
        billNumber={payingFor?.id?.replace('#', '')}
        onPaid={() => placeOrder(payingFor)}
        onClose={() => setPayingFor(null)}
      />
    </form>
  );
};

export default PlaceOrder;
