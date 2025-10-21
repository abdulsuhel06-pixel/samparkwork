import React, { useState } from "react";
import BidForm from "../components/BidForm";
import BidList from "../components/BidList";

const Bids = () => {
  const [bids, setBids] = useState([]);

  const handleAddBid = (newBid) => {
    setBids([newBid, ...bids]);
  };

  return (
    <div className="container my-4">
      {/* Page Header */}
      <div className="text-center mb-4">
        <h1 className="fw-bold text-primary">Project Bids</h1>
        <p className="text-muted">Place your bids and view all offers</p>
      </div>

      <div className="row">
        {/* Bid Form Section */}
        <div className="col-lg-4 col-md-5 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white fw-bold">
              Place a New Bid
            </div>
            <div className="card-body">
              <BidForm onAddBid={handleAddBid} />
            </div>
          </div>
        </div>

        {/* Bid List Section */}
        <div className="col-lg-8 col-md-7">
          <div className="card shadow-sm">
            <div className="card-header bg-secondary text-white fw-bold">
              All Bids
            </div>
            <div className="card-body">
              <BidList bids={bids} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bids;
