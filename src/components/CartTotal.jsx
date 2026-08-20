import { useContext } from "react"
import { ShopContext } from "../context/ShopContext"
import Title from './Title';

const CartTotal = () => {
   const {currency,delivery_fee,getCartAmount} = useContext(ShopContext);
   const subtotal = getCartAmount();
  return (
    <div className="w-full">
      <div className="text-2xl ">
         <Title text1={'CART'} text2={'totals'}/>
      </div>

      <div className="flex-col flex gap-2 mt-2 text-sm">
         <div className="justify-between flex">
            <p>Sub Total</p>
            <p>{currency}{subtotal}.00 </p>
         </div>
         <hr />
         <div className="flex justify-between">
            <p>Shipping Fee</p>
            <p>{currency}{subtotal === 0 ? 0 : delivery_fee}.00 </p>
         </div>
         <hr />
         <div className="flex justify-between">
            <p>Total</p>
            <p>{currency}{subtotal === 0 ? 0 : subtotal + delivery_fee}.00 </p>
         </div>
      </div>
    </div>
  )
}

export default CartTotal
