//About.jsx
import { assets } from "../assets/frontend_assets/assets";
import NewsLetterBox from "../components/NewsLetterBox";
import Title from "../components/Title";

const About = () => {
  return (
    <>
      {/* About Us Section */}
      <div className="text-2xl text-center pt-8 border-t">
        <Title text1="about" text2="us" />
      </div>

      <div className="my-10 flex flex-col md:flex-row gap-10 px-4 md:px-8">
        {/* About Image */}
        <img 
          className="w-full md:max-w-[450px] mx-auto rounded-lg shadow-md" 
          src={assets.about_img} 
          alt="About Us" 
        />

        {/* About Description */}
        <div className="flex flex-col justify-center gap-6 md:w-2/3 text-gray-700">
          <p>
            Welcome to our company! We are passionate about delivering high-quality products and exceptional services tailored to meet your unique needs. With a focus on innovation and reliability, we aim to exceed your expectations at every step.
          </p>
          <p>
            Our experienced team is committed to building lasting relationships with our customers, fostering trust, and creating value through outstanding solutions. Your satisfaction is at the heart of everything we do.
          </p>
          <b className="text-gray-800 text-lg">Our Mission</b>
          <p>
            Our mission is to empower our customers with reliable, efficient, and innovative solutions that make a positive impact. We are dedicated to driving excellence and creating opportunities for growth and success.
          </p>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="text-center py-8">
        <Title text1="why" text2="choose us" />
      </div>

      <div className="flex flex-col md:flex-row text-sm mb-20">
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b>Quality Assurance</b>
          <p className="text-gray-600">
            Every piece is checked by hand before it ships, so what arrives is exactly what you saw in the catalogue.
          </p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b>Convenience</b>
          <p className="text-gray-600">
            Browse, order and track your delivery in a few taps — on the web or straight inside Telegram.
          </p>
        </div>
        <div className="border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5">
          <b>Exceptional Customer Service</b>
          <p className="text-gray-600">
            Our team answers you in the same chat you ordered from, seven days a week.
          </p>
        </div>
      </div>

      <NewsLetterBox />
    </>
  );
};

export default About;
