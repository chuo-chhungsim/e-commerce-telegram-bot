//Orders.jsx
import { useContext } from "react"
import { Link } from "react-router-dom"
import { ShopContext } from "../context/ShopContext"
import Title from './../components/Title';
import { toast } from "react-toastify";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

const Orders = () => {
  const { orders, currency } = useContext(ShopContext);

  return (
    <>
      <div className="border-t pt-16 pb-10">
        <div className="text-2xl">
          <Title text1={'my'} text2={'Orders'} />
        </div>

        {orders.length === 0 ? (
          <p className="py-16 text-center text-gray-500">
            You have no orders yet.{' '}
            <Link to="/collection" className="text-black underline">Start shopping</Link>
          </p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="mb-10">
              <div className="flex flex-wrap items-center justify-between gap-2 pt-6">
                <p className="text-base font-medium">Order {order.id} Confirmed</p>
                <p className="text-sm text-gray-500">
                  {formatDate(order.createdAt)} · Total: {currency}{order.total}
                </p>
              </div>

              {order.items.map((item, index) => (
                <div key={`${order.id}-${index}`} className="py-4 border-t border-b text-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4 text-sm">
                    <img className="w-16 sm:w-20" src={item.image} alt="" />
                    <div className="">
                      <p className="text-base font-medium">{item.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-base text-gray-700">
                        <p>{currency}{item.price}</p>
                        <p>Quantity: {item.quantity}</p>
                        <p>Size: {item.size}</p>
                      </div>
                      <p className="mt-2">Order Date: <span className="text-base text-gray-700">{formatDate(order.createdAt)}</span></p>
                    </div>
                  </div>
                  <div className="md:w-1/2 flex justify-between">
                    <div className="flex items-center gap-3">
                      <p className="min-w-2 h-2 rounded-full bg-green-500"></p>
                      <p className="text-sm sm:text-base">{order.status ?? 'Processing'}</p>
                    </div>
                    <button
                      onClick={() => toast.info(`Order ${order.id}: ${order.status ?? 'Processing'}`)}
                      className="border px-4 py-2 bg-white text-black rounded"
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              ))}

              {!order.synced && (
                <p className="mt-2 text-xs text-gray-400">
                  Saved on this device — connect the bot server to receive a chat receipt.
                </p>
              )}
            </div>
          ))
        )}
      </div>      
    </>
  )
}

export default Orders
