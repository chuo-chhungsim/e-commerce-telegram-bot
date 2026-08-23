import { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { Link } from 'react-router-dom';
import { haptic } from '../telegram/tg';

const ProductItem = ({ id, image, name, price }) => {
   const { currency } = useContext(ShopContext);

   return (
      <Link onClick={() => haptic.impact('light')} to={`/product/${id}`} className='text-gray-700 cursor-pointer'>
         <div className="overflow-hidden rounded">
            <img className='hover:scale-110 transition ease-in-out' src={image[0]} alt={name} />       
         </div>
         <p className='pt-3 pb-1 text-sm'>{name}</p>
         <p className='text-sm font-medium'>{currency}{price}</p>
      </Link>
   );
}

export default ProductItem;
