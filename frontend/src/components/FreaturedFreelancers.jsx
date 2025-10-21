import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./FeaturedFreelancers.css"; // custom styles

export default function FeaturedFreelancers() {
  const freelancers = [
    {
      name: "Sarah Johnson",
      title: "Full Stack Developer",
      rating: 4.9,
      reviews: 127,
      location: "San Francisco, CA",
      skills: ["React", "Node.js", "MongoDB", "+1"],
      time: "1 hour",
      jobs: 150,
      description:
        "Experienced full-stack developer with 8+ years in web development",
      rate: 85,
      image: "https://via.placeholder.com/80", // replace with actual image
    },
    {
      name: "Alex Chen",
      title: "UI/UX Designer",
      rating: 4.8,
      reviews: 89,
      location: "New York, NY",
      skills: ["Figma", "Adobe XD", "Prototyping", "+1"],
      time: "30 mins",
      jobs: 95,
      description:
        "Creative designer focused on user-centered design and modern interfaces",
      rate: 75,
      image: "https://via.placeholder.com/80",
    },
    {
      name: "Maria Rodriguez",
      title: "Content Writer",
      rating: 5.0,
      reviews: 203,
      location: "Barcelona, Spain",
      skills: ["SEO Writing", "Blog Posts", "Copywriting", "+1"],
      time: "2 hours",
      jobs: 280,
      description:
        "Professional content writer specializing in tech and business content",
      rate: 45,
      image: "https://via.placeholder.com/80",
    },
  ];

  return (
    <section className="featured-section py-5">
      <div className="container">
        <h2 className="text-center fw-bold mb-2">Featured Freelancers</h2>
        <p className="text-center text-muted mb-5">
          Work with top-rated freelancers who deliver exceptional results
        </p>

        <div className="row g-4">
          {freelancers.map((freelancer, index) => (
            <div className="col-md-4" key={index}>
              <div className="card shadow-sm border-0 rounded-4 freelancer-card">
                <div className="card-body text-center">
                  <img
                    src={freelancer.image}
                    alt={freelancer.name}
                    className="rounded-circle mb-3 freelancer-img"
                  />
                  <h5 className="fw-bold">{freelancer.name}</h5>
                  <p className="text-muted mb-2">{freelancer.title}</p>

                  <div className="d-flex justify-content-center align-items-center mb-2">
                    <span className="text-warning me-1">★</span>
                    <span className="fw-bold">{freelancer.rating}</span>
                    <small className="text-muted ms-1">
                      ({freelancer.reviews})
                    </small>
                  </div>

                  <p className="text-muted small mb-2">
                    📍 {freelancer.location}
                  </p>

                  <div className="mb-3">
                    {freelancer.skills.map((skill, idx) => (
                      <span className="badge bg-light text-dark me-1" key={idx}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="d-flex justify-content-center text-muted small mb-2">
                    <span className="me-3">⏱ {freelancer.time}</span>
                    <span>✔ {freelancer.jobs} jobs completed</span>
                  </div>

                  <p className="small text-muted">{freelancer.description}</p>

                  <h5 className="fw-bold">${freelancer.rate}/hr</h5>

                  <div className="d-flex justify-content-center gap-2 mt-3">
                    <button className="btn btn-outline-secondary btn-sm">
                      View Profile
                    </button>
                    <button className="btn btn-success btn-sm">Contact</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
