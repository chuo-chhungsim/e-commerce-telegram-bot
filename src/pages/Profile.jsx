//Profile.jsx
import { useContext } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Database,
  Globe,
  Info,
  LogOut,
  Mail,
  Package,
  Server,
  ShoppingBag,
  Smartphone,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import Title from "../components/Title";
import { ShopContext } from "../context/ShopContext";
import { useTelegram } from "../telegram/TelegramProvider";
import { closeApp, haptic, isTelegram, showConfirm } from "../telegram/tg";
import { storageBackend } from "../telegram/cloudStorage";
import { hasBackend } from "../lib/api";
import { toast } from "react-toastify";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between border-b py-3 text-sm">
    <span className="flex items-center gap-2 text-gray-500">
      <Icon size={16} strokeWidth={1.75} />
      {label}
    </span>
    <span className="text-gray-800">{value}</span>
  </div>
);

/**
 * Replaces the old email/password login page: a Telegram Mini App already knows
 * who the user is, so there is nothing to sign in to.
 */
const Profile = () => {
  const { user, colorScheme, platform, version } = useTelegram();
  const { orders, clearCart, getCartCount } = useContext(ShopContext);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Guest';

  const handleClearCart = async () => {
    if (getCartCount() === 0) {
      toast.info('Your cart is already empty');
      return;
    }
    if (!(await showConfirm('Empty your cart?'))) return;
    haptic.notify('warning');
    clearCart();
    toast.success('Cart emptied');
  };

  return (
    <div className="border-t pt-14 pb-20">
      <div className="text-2xl">
        <Title text1={'my'} text2={'Profile'} />
      </div>

      {/* Account card */}
      <div className="mt-6 flex items-center gap-5 border p-6">
        {user?.photo_url ? (
          <img src={user.photo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <User size={32} strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xl font-medium text-gray-800">{fullName}</p>
          {user?.username && <p className="truncate text-sm text-gray-500">@{user.username}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <BadgeCheck size={14} strokeWidth={1.75} className="text-green-600" />
            Signed in with Telegram · ID {user?.id ?? '—'}
          </p>
        </div>
      </div>

      {!isTelegram && (
        <p className="mt-4 border border-dashed p-4 text-sm text-gray-500">
          You are viewing the site in a normal browser, so this is demo profile data. Open the
          shop from the Telegram bot to see the real account.
        </p>
      )}

      <div className="mt-10 flex flex-col gap-10 md:flex-row">
        {/* Shortcuts */}
        <div className="flex-1">
          <p className="mb-4 text-lg font-medium text-gray-800">Account</p>
          <div className="flex flex-col">
            <Link to="/orders" className="flex items-center gap-3 border-b py-3 text-sm text-gray-700 hover:text-black">
              <Package size={18} strokeWidth={1.75} />
              My orders
              <span className="ml-auto text-gray-400">{orders.length}</span>
            </Link>
            <Link to="/collection" className="flex items-center gap-3 border-b py-3 text-sm text-gray-700 hover:text-black">
              <ShoppingBag size={18} strokeWidth={1.75} />
              Collection
            </Link>
            <Link to="/about" className="flex items-center gap-3 border-b py-3 text-sm text-gray-700 hover:text-black">
              <Info size={18} strokeWidth={1.75} />
              About us
            </Link>
            <Link to="/contact" className="flex items-center gap-3 border-b py-3 text-sm text-gray-700 hover:text-black">
              <Mail size={18} strokeWidth={1.75} />
              Contact
            </Link>
            <button onClick={handleClearCart} className="flex items-center gap-3 border-b py-3 text-left text-sm text-red-600">
              <Trash2 size={18} strokeWidth={1.75} />
              Empty cart
            </button>
          </div>

          {isTelegram && (
            <button
              onClick={closeApp}
              className="mt-8 flex items-center gap-2 border border-black px-8 py-3 text-sm text-black transition-all duration-500 hover:bg-black hover:text-white"
            >
              <LogOut size={16} strokeWidth={1.75} />
              Close app
            </button>
          )}
        </div>

        {/* Client info - handy to show during the demo */}
        <div className="flex-1">
          <p className="mb-4 text-lg font-medium text-gray-800">Mini App info</p>
          <InfoRow icon={Smartphone} label="Client" value={platform} />
          <InfoRow icon={Server} label="Bot API" value={version} />
          <InfoRow icon={Sun} label="Theme" value={colorScheme} />
          <InfoRow icon={Globe} label="Language" value={user?.language_code ?? '—'} />
          <InfoRow icon={Database} label="Storage" value={storageBackend()} />
          <InfoRow icon={Server} label="Order backend" value={hasBackend ? 'Bot server' : 'Demo (local only)'} />
        </div>
      </div>
    </div>
  );
};

export default Profile;
