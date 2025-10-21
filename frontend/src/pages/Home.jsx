import React from 'react';
import Hero from '../components/Hero';
import AdvertisementShowcase from '../components/AdvertisementShowcase';
import JobManagement from '../components/JobManagement';
import FeaturedCategories from '../components/FeaturedCategories';

const Home = () => {
  return (
    <>
      <Hero />
      <AdvertisementShowcase />
      <JobManagement />
      <FeaturedCategories />
    </>
  );
};

export default Home;
