import React from 'react';
import Hero from '../components/Hero';
import AdvertisementShowcase from '../components/AdvertisementShowcase';
import JobManagement from '../components/JobManagement';
import FeaturedCategories from '../components/FeaturedCategories';
import PopupAdvertisement from '../components/PopupAdvertisement';

const Home = () => {
  return (
    <>
      <Hero />
      <AdvertisementShowcase />
      <JobManagement />
      <FeaturedCategories />
      
      {/* ✅ Popup Advertisement System - Automatically manages display */}
      <PopupAdvertisement />
    </>
  );
};

export default Home;
