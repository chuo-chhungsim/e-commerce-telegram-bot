import { Link } from 'react-router-dom';
import { assets } from '../assets/frontend_assets/assets';

const Footer = () => {
  return (
    <div>
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
        <div>
          <img src={assets.logo} alt="Forever" className="mb-5 w-32" />
          <p className="w-full md:w-2/3 text-gray-600">
            Forever is a small fashion label built for people who want good basics without the
            hassle. Browse the catalogue, order in a few taps, and follow your delivery right
            from the chat.
          </p>
        </div>

        <div>
          <p className="text-xl font-medium mb-5">COMPANY</p>
          <ul className="flex flex-col gap-1 text-gray-600">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/orders">Orders</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xl font-medium mb-5">GET IN TOUCH</p>
          <ul className="flex flex-col gap-1 text-gray-600">
            <li>+855 12 122 391</li>
            <li>admin@forever.com</li>
          </ul>
        </div>
      </div>

      <div>
        <hr />
        <p className="py-5 text-sm text-center text-gray-600">
          Copyright {new Date().getFullYear()} @ forever.com — All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Footer;
