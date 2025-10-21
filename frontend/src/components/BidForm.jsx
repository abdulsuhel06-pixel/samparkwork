import React, { useState } from "react";

const BidForm = ({ onAddBid }) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !amount) return;
    const newBid = { name, amount, message, date: new Date().toLocaleString() };
    onAddBid(newBid);
    setName("");
    setAmount("");
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label fw-bold">Name</label>
        <input
          type="text"
          className="form-control"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-bold">Bid Amount</label>
        <input
          type="number"
          className="form-control"
          placeholder="Enter bid amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-bold">Message</label>
        <textarea
          className="form-control"
          rows="3"
          placeholder="Optional message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        ></textarea>
      </div>

      <button type="submit" className="btn btn-primary w-100">
        Submit Bid
      </button>
    </form>
  );
};

export default BidForm;

