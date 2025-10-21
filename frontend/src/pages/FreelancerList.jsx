import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FreelancerList = () => {
  const [list, setList] = useState([]);
  const [skill, setSkill] = useState('');

  useEffect(() => { axios.get('/api/users/freelancers').then(r=>setList(r.data)); }, []);

  const search = async () => {
    const { data } = await axios.get(`/api/users/freelancers?skill=${encodeURIComponent(skill)}`);
    setList(data);
  };

  return (
    <div className="container py-4">
      <div className="d-flex mb-3">
        <input className="form-control me-2" placeholder="Filter by skill (e.g. React)" value={skill} onChange={e=>setSkill(e.target.value)}/>
        <button className="btn btn-outline-primary" onClick={search}>Search</button>
      </div>

      <div className="row">
        {list.map(f => (
          <div className="col-md-4 mb-3" key={f._id}>
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <img src={f.avatar || '/avatar.png'} className="rounded-circle me-2" width={40} height={40}/>
                  <div>
                    <div className="fw-semibold">{f.name}</div>
                    <small className="text-muted">{f.title}</small>
                  </div>
                </div>
                <div className="mb-2">{f.bio?.slice(0, 100)}</div>
                <div className="mb-2">
                  {f.skills?.slice(0,4).map(s => <span key={s} className="badge bg-light text-dark me-1">{s}</span>)}
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-primary fw-bold">${f.hourlyRate || 0}/hr</span>
                  <a className="btn btn-sm btn-primary" href={`/freelancers/${f._id}`}>View Profile</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default FreelancerList;
