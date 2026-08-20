import { toast } from 'react-toastify';

const NewsLetterBox = () => {
   const onHandleSubmit = (event) =>{
      event.preventDefault();
      toast.success('Subscribed! Your 20% off code is on its way.');
      event.target.reset();
   }
  return (
    <div className="text-center">
      <p className="text-2xl font-medium text-gray-800">Subscribe Now & get 20% off</p>
      <p className="text-gray-400 mt-3">
         Introducing our new letter box, designed with a sleek and modern aesthetic. Crafted from durable materials, it offers both security and style, perfect for keeping your mail safe and adding a touch of elegance to your home
      </p>
      <form onSubmit={onHandleSubmit} className="w-full sm:w-1/2 flex items-center gap-4 mx-auto my-6 border pl-3">
         <input className="w-full sm:flex-1 outline-none" type="email" required placeholder="Enter Your Emails" />
         <button type="submit" className="bg-black text-white text-xs px-10 py-4">Subscribe</button>
      </form>
    </div>
  )
}

export default NewsLetterBox
