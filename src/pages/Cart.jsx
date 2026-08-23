//Cart.jsx
import { useContext } from "react"
import { Link } from "react-router-dom"
import { ShopContext } from "../context/ShopContext"
import Title from './../components/Title';
import { assets } from "../assets/frontend_assets/assets";
import CartTotal from "../components/CartTotal";

const Cart = () => {
  const {currency,getCartLines,updateQuantity,navigate,hydrated} = useContext(ShopContext);
  const cartData = getCartLines();

  if (hydrated && cartData.length === 0) {
    return (
      <div className="border-t pt-14 pb-24">
        <div className="text-2xl mb-3 ">
          <Title text1={'YOUR'} text2={'cart'}/>
        </div>
        <p className="py-16 text-center text-gray-500">
          Your cart is empty.{' '}
          <Link to="/collection" className="text-black underline">Browse the collection</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="border-t pt-14">
      <div className="text-2xl mb-3 ">
      <Title text1={'YOUR'} text2={'cart'}/>
      </div>
      {
        cartData.map((item,index)=>{
          const productData = item.product;
          return(
            <div key={index} className="py-4 border-t border-b text-gray-700 grid grid-cols-[4fr_0.5fr_0.5fr] sm:grid-cols-[4fr_2fr_0.5fr] items-center gap-4">
              <div className="flex items-start gap-6">
                <img className="w-1/6 sm:w-20" src={productData.image[0]} alt="" />
                <div>
                  <p className="text-sm font-medium sm:text-lg">{productData.name}</p>
                  <div className="flex items-center gap-5 mt-2">
                    <p>{currency}{productData.price}</p>
                    <p className="px-2 sm:px-3 sm:py-1 border bg-slate-50">{item.size}</p>
                  </div>
                </div>
              </div>
              <input
                onChange={(e)=> e.target.value === '' || e.target.value === '0' ? null : updateQuantity(item._id, item.size, Number(e.target.value))}
                className="border sm:max-w-20 max-w-10 px-1 sm:py-2 py-1"
                type="number"
                min={1}
                value={item.quantity}
              />
              <img onClick={()=>updateQuantity(item._id,item.size,0)}  className="w-4 mr-4 cursor-pointer" src={assets.bin_icon} alt="" />
            </div>
          )
        })
      }
      <div className="flex justify-end my-20 ">
        <div className="w-full sm:w-[450px]">
          <CartTotal/>
          <div className="w-full text-end">
          <button onClick={()=>navigate('/place-order')} className="uppercase bg-black text-white text-sm my-8 py-3 px-7"> Proceed to checkout</button>
          </div>
        </div>
      </div>
    </div>
    
  )
}

export default Cart
