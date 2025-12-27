import React from "react";

const Categories = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden mt-10 md:mt-20">
      <h1 className="text-2xl md:text-7xl font-semibold text-center mx-auto p-4">
        Our Latest Creations
      </h1>
      <p className="text-sm md:text-xl text-slate-500 text-center mt-2 mx-auto">
        A visual collection of our most recent works - each piece crafted with
        intention, emotion, and style.
      </p>

      <div className="flex items-center gap-2 h-[400px] w-full px-5 mt-10 mx-auto">
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1719368472026-dc26f70a9b76?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
          {/* Overlay (optional dark layer for readability) */}
          {/* <div className="absolute inset-0 bg-black/30"></div> */}

          {/* Button */}
          <button
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 
      rounded-full bg-white px-5 py-2 text-sm font-medium text-black 
      hover:bg-gray-200 transition"
          >
            View Details
          </button>

          {/* Text */}
          <p className="absolute top-5 left-5 z-50 text-white font-semibold">
            Poorna Kanishka
          </p>
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1649265825072-f7dd6942baed?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1555212697-194d092e3b8f?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1729086046027-09979ade13fd?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1601568494843-772eb04aca5d?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1585687501004-615dfdfde7f1?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1601568494843-772eb04aca5d?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
        <div className="relative group grow transition-all w-56 rounded-lg overflow-hidden h-[400px] duration-500 hover:w-[300px]">
          <img
            className="h-full w-full object-cover object-center"
            src="https://images.unsplash.com/photo-1585687501004-615dfdfde7f1?q=80&h=800&w=800&auto=format&fit=crop"
            alt="image"
          />
        </div>
      </div>
    </div>
  );
};

export default Categories;
