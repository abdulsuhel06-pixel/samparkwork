// pages/ProjectDetails.jsx
import React from "react";
import BidForm from "../components/BidForm";
import BidList from "../components/BidList";

const ProjectDetails = ({ projectId }) => {
  return (
   <div className="container mt-4">
      <h2>Project Title</h2>
      <p>Project description goes here...</p>

      <hr />
      <h3>Bids</h3>
      <BidList />

      <hr />
      <h3>Place Your Bid</h3>
      <BidForm />
    </div>
  );
};

export default ProjectDetails;
