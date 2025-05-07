const db = require("../database");
const JobListing = require("../models/job_listing");
const JobApplication = require("../models/job_application");
const Employer = require("../models/employer"); // Add this to fetch employer details

exports.getHome = (req, res) => {
  let dashboardRoute = "";
  if (req.session && req.session.user) {
    switch (req.session.user.role) {
      case "Admin":
        dashboardRoute = "/adminD/profile";
        break;
      case "Employer":
        dashboardRoute = "/employerD/profile";
        break;
      case "Freelancer":
        dashboardRoute = "/freelancerD/profile";
        break;
    }
  }
  res.render("Aman/home", {
    user: req.session && req.session.user ? req.session.user : null,
    dashboardRoute,
  });
};

exports.getBlog = (req, res) => {
  res.render("Aman/blog");
};

exports.getJobListing = async (req, res) => {
  try {
    let dashboardRoute = "";
    if (req.session && req.session.user) {
      switch (req.session.user.role) {
        case "Admin":
          dashboardRoute = "/adminD/profile";
          break;
        case "Employer":
          dashboardRoute = "/employerD/profile";
          break;
        case "Freelancer":
          dashboardRoute = "/freelancerD/profile";
          break;
      }
    }

    const jobListings = await JobListing.find({ status: "open" }).lean();
    console.log("Fetched job listings:", jobListings);

    res.locals.user = req.session && req.session.user ? req.session.user : null;
    res.locals.dashboardRoute = dashboardRoute;

    res.render("Deepak/Job_listing_public", {
      user: req.session && req.session.user ? req.session.user : null,
      dashboardRoute,
      jobListings,
    });
  } catch (error) {
    console.error("Error fetching job listings:", error);
    res.status(500).send("Error fetching job listings");
  }
};

exports.getJobDetails = async (req, res) => {
  try {
    const jobId = req.params.jobId || req.query.jobId;
    console.log("Job ID from request:", jobId);

    if (!jobId) {
      return res.status(400).send("Job ID is required");
    }

    const job = await JobListing.findOne({ jobId }).lean();
    console.log("Fetched job:", job);

    if (!job) {
      return res.status(404).send("Job not found. Please select a job from the listings.");
    }

    // Fetch the employer details using the employerId from the job
    const employer = await Employer.findOne({ employerId: job.employerId }).lean();
    console.log("Fetched employer:", employer);

    if (!employer) {
      return res.status(404).send("Employer not found for this job.");
    }

    let dashboardRoute = "";
    if (req.session.user) {
      switch (req.session.user.role) {
        case "Admin":
          dashboardRoute = "/adminD/profile";
          break;
        case "Employer":
          dashboardRoute = "/employerD/profile";
          break;
        case "Freelancer":
          dashboardRoute = "/freelancerD/profile";
          break;
      }
    }

    res.render("Deepak/see_more_detail", {
      user: req.session.user || null,
      dashboardRoute,
      job,
      companyName: employer.companyName || "Not specified", // Pass the company name
    });
  } catch (error) {
    console.error("Error loading job details:", error);
    res.status(500).send("Server Error");
  }
};

exports.getJobApplication = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    console.log("Job ID for application:", jobId);

    if (!jobId) {
      return res.status(400).send("Job ID is required");
    }

    const job = await JobListing.findOne({ jobId }).lean();
    console.log("Fetched job for application:", job);

    if (!job) {
      return res.status(404).send("Job not found");
    }

    let dashboardRoute = "";
    if (req.session.user) {
      switch (req.session.user.role) {
        case "Admin":
          dashboardRoute = "/adminD/profile";
          break;
        case "Employer":
          dashboardRoute = "/employerD/profile";
          break;
        case "Freelancer":
          dashboardRoute = "/freelancerD/profile";
          break;
      }
    }

    res.render("Deepak/jobs_apply", {
      user: req.session.user || null,
      dashboardRoute,
      job,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error("Error loading job application page:", error);
    res.status(500).send("Server Error");
  }
};

exports.applyForJob = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "Freelancer") {
      return res.redirect(`/jobs/apply/${req.params.jobId}?error=Unauthorized: Please log in as a Freelancer`);
    }

    const { jobId, coverMessage, resumeLink } = req.body;
    const freelancerId = req.session.user.roleId;

    console.log("Received jobId:", jobId); // Debug log

    // Validate input
    if (!jobId || !coverMessage || !resumeLink) {
      return res.redirect(`/jobs/apply/${jobId}?error=Missing required fields`);
    }

    // Verify job exists
    const job = await JobListing.findOne({ jobId });
    console.log("Found job:", job); // Debug log

    if (!job) {
      return res.redirect(`/jobs/apply/${jobId}?error=Job not found`);
    }

    // Check if freelancer has already applied to this job
    const existingApplication = await JobApplication.findOne({
      freelancerId,
      jobId,
    });

    if (existingApplication) {
      return res.redirect(`/jobs/apply/${jobId}?error=You can't apply to the same job more than once, wait for it to get approved.`);
    }

    // Create new job application
    const jobApplication = new JobApplication({
      freelancerId,
      jobId,
      coverMessage,
      resumeLink,
      status: "Pending"
    });

    await jobApplication.save();

    // Redirect to success page with jobId
    res.redirect(`/jobs/application-submitted/${jobId}?success=true`);
  } catch (error) {
    console.error("Error submitting job application:", error);
    res.redirect(`/jobs/apply/${req.body.jobId}?error=Failed to submit application`);
  }
};

exports.getApplicationSubmitted = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    console.log("Job ID for success page:", jobId);

    if (!jobId) {
      return res.status(400).send("Job ID is required");
    }

    const job = await JobListing.findOne({ jobId }).lean();
    console.log("Fetched job for success page:", job);

    if (!job) {
      return res.status(404).send("Job not found. Please select a job from the listings.");
    }

    let dashboardRoute = "";
    if (req.session && req.session.user) {
      switch (req.session.user.role) {
        case "Admin":
          dashboardRoute = "/adminD/profile";
          break;
        case "Employer":
          dashboardRoute = "/employerD/profile";
          break;
        case "Freelancer":
          dashboardRoute = "/freelancerD/profile";
          break;
      }
    }

    const success = req.query.success === "true";

    res.render("Deepak/application_submitted", {
      user: req.session && req.session.user ? req.session.user : null,
      dashboardRoute,
      success,
      job,
    });
  } catch (error) {
    console.error("Error loading application submitted page:", error);
    res.status(500).send("Server Error");
  }
};

exports.getProfile = (req, res) => {
  let dashboardRoute = "";
  if (req.session && req.session.user) {
    switch (req.session.user.role) {
      case "Admin":
        dashboardRoute = "/adminD/profile";
        break;
      case "Employer":
        dashboardRoute = "/employerD/profile";
        break;
      case "Freelancer":
        dashboardRoute = "/freelancerD/profile";
        break;
    }
  }
  res.render("Aman/common_profile", {
    user: req.session && req.session.user ? req.session.user : null,
    dashboardRoute,
  });
};