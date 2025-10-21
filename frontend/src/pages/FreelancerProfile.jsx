import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const FreelancerProfile = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`/api/users/${id}`).then(r => setData(r.data));
  }, [id]);

  if (!data) return <div className="container py-5">Loading…</div>;
  const { user, reviews } = data;

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <img src={user.avatar || '/avatar.png'} className="rounded-circle mb-2" width={96} height={96}/>
              <h5 className="mb-0">{user.name}</h5>
              <small className="text-muted">{user.title}</small>
              <div className="mt-2">{user.location}</div>
              <div className="mt-2 text-primary fw-bold">${user.hourlyRate || 0}/hr</div>
              <div className="mt-3">
                {user.skills?.map(s => <span key={s} className="badge bg-light text-dark me-1 mb-1">{s}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm mb-3">
            <div className="card-header bg-light fw-semibold">About</div>
            <div className="card-body">{user.bio || 'No bio yet.'}</div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-header bg-light fw-semibold">Portfolio</div>
            <div className="card-body">
              <div className="row">
                {user.portfolio?.length ? user.portfolio.map((p, i) => (
                  <div className="col-md-6 mb-3" key={i}>
                    <div className="border rounded p-2">
                      <img src={p.imageUrl} className="img-fluid rounded mb-2"/>
                      <div className="fw-semibold">{p.title}</div>
                      {p.link && <a href={p.link} target="_blank">View</a>}
                    </div>
                  </div>
                )) : <div className="text-muted">No portfolio items.</div>}
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light fw-semibold">Reviews</div>
            <div className="card-body">
              {reviews.length ? reviews.map(r => (
                <div className="mb-3 border-bottom pb-2" key={r._id}>
                  <div className="d-flex align-items-center mb-1">
                    <img src={r.client?.avatar || '/avatar.png'} className="rounded-circle me-2" width={32} height={32}/>
                    <div className="fw-semibold">{r.client?.name}</div>
                    <span className="badge bg-success ms-2">{r.rating}★</span>
                  </div>
                  <div>{r.comment}</div>
                </div>
              )) : <div className="text-muted">No reviews yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FreelancerProfile;
