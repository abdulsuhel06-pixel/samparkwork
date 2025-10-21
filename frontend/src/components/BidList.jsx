import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button } from "react-bootstrap";

const BidList = ({ projectId }) => {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    const fetchBids = async () => {
      const { data } = await axios.get(`/api/bids/${projectId}`);
      setBids(data);
    };
    fetchBids();
  }, [projectId]);

  const updateStatus = async (bidId, status) => {
    await axios.put(`/api/bids/${bidId}`, { status });
    setBids(bids.map(b => b._id === bidId ? { ...b, status } : b));
  };

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Freelancer</th>
          <th>Amount</th>
          <th>Delivery</th>
          <th>Proposal</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {bids.map(bid => (
          <tr key={bid._id}>
            <td>{bid.freelancer.name}</td>
            <td>${bid.amount}</td>
            <td>{bid.deliveryTime} days</td>
            <td>{bid.proposal}</td>
            <td>{bid.status}</td>
            <td>
              {bid.status === "pending" && (
                <>
                  <Button size="sm" variant="success" onClick={() => updateStatus(bid._id, "accepted")}>Accept</Button>{' '}
                  <Button size="sm" variant="danger" onClick={() => updateStatus(bid._id, "rejected")}>Reject</Button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default BidList;
