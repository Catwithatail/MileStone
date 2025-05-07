const JobListing = require("../models/job_listing");
const JobApplication = require("../models/job_application");
const User = require("../models/user");
const Employer = require("../models/employer");
const Freelancer = require("../models/freelancer");

const employerController = {
  getCurrentJobs: async (req, res) => {
    try {
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const jobs = await JobListing.find({
        employerId,
        status: "closed",
        "assignedFreelancer.freelancerId": { $ne: "" },
        "assignedFreelancer.status": "working",
      }).lean();

      const freelancerIds = jobs.map(job => job.assignedFreelancer.freelancerId).filter(id => id);

      const freelancers = await Freelancer.find({ freelancerId: { $in: freelancerIds } })
        .select("freelancerId skills")
        .lean();
      const users = await User.find({ roleId: { $in: freelancerIds } })
        .select("roleId name picture")
        .lean();

      const freelancersWithDetails = jobs.map(job => {
        const freelancer = freelancers.find(f => f.freelancerId === job.assignedFreelancer.freelancerId);
        const user = users.find(u => u.roleId === job.assignedFreelancer.freelancerId);
        return {
          jobId: job.jobId,
          projectName: job.title,
          skills: freelancer?.skills || job.description.skills || [],
          startDate: job.assignedFreelancer.startDate,
          freelancer: {
            id: job.assignedFreelancer.freelancerId,
            name: user?.name || "Unknown Freelancer",
            picture: user?.picture || "/assets/user_female.png",
            rating: 4.7,
          },
        };
      });

      res.render("Abhishek/current_jobs", {
        user: { name: req.session.user.name },
        activePage: "current_jobs",
        freelancers: freelancersWithDetails,
      });
    } catch (error) {
      console.error("Error fetching current jobs:", error.message);
      res.status(500).send("Error fetching current jobs: " + error.message);
    }
  },

  getPreviouslyWorked: async (req, res) => {
    try {
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const jobs = await JobListing.find({
        employerId,
        status: "closed",
        "assignedFreelancer.freelancerId": { $ne: "" },
        "assignedFreelancer.status": "finished",
      }).lean();

      const freelancerIds = jobs.map(job => job.assignedFreelancer.freelancerId).filter(id => id);

      const freelancers = await Freelancer.find({ freelancerId: { $in: freelancerIds } })
        .select("freelancerId skills")
        .lean();
      const users = await User.find({ roleId: { $in: freelancerIds } })
        .select("roleId name picture")
        .lean();

      const freelancersWithDetails = jobs.map(job => {
        const freelancer = freelancers.find(f => f.freelancerId === job.assignedFreelancer.freelancerId);
        const user = users.find(u => u.roleId === job.assignedFreelancer.freelancerId);
        const completionDate = job.updatedAt || new Date();
        return {
          jobId: job.jobId,
          projectName: job.title,
          skills: freelancer?.skills || job.description.skills || [],
          completionDate,
          freelancer: {
            id: job.assignedFreelancer.freelancerId,
            name: user?.name || "Unknown Freelancer",
            picture: user?.picture || "/assets/user_female.png",
            rating: 4.7,
          },
        };
      });

      res.render("Abhishek/previously_worked", {
        user: { name: req.session.user.name },
        activePage: "previously_worked",
        freelancers: freelancersWithDetails,
      });
    } catch (error) {
      console.error("Error fetching previously worked freelancers:", error.message);
      res.status(500).send("Error fetching previously worked freelancers: " + error.message);
    }
  },

  getJobListings: async (req, res) => {
    try {
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const jobListings = await JobListing.find({
        employerId,
        status: { $nin: ["closed", "completed"] },
      })
        .sort({ postedDate: -1 })
        .lean();

      res.render("Abhishek/job_listing", {
        user: { name: req.session.user.name },
        activePage: "job_listings",
        jobListings,
      });
    } catch (error) {
      console.error("Error fetching job listings:", error.message);
      res.status(500).send("Error fetching job listings: " + error.message);
    }
  },

  getNewJobForm: (req, res) => {
    res.render("Abhishek/others/new_job", {
      user: { name: req.session.user.name },
      activePage: "job_listings",
    });
  },

  createJobListing: async (req, res) => {
    try {
      const {
        title,
        budget,
        imageUrl,
        location,
        jobType,
        experienceLevel,
        remote,
        applicationDeadline,
        description,
        milestones,
      } = req.body;

      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const newJob = new JobListing({
        employerId,
        imageUrl,
        title,
        budget: {
          amount: Number(budget.amount),
          period: budget.period,
        },
        location,
        jobType,
        experienceLevel,
        remote: remote === "true",
        applicationDeadline,
        description: {
          text: description.text,
          responsibilities: description.responsibilities
            .split("\n")
            .filter((r) => r.trim()),
          requirements: description.requirements
            .split("\n")
            .filter((r) => r.trim()),
          skills: description.skills.split("\n").filter((s) => s.trim()),
        },
        milestones: milestones.map((m) => ({
          description: m.description,
          deadline: m.deadline,
          payment: m.payment,
          status: "not-paid",
        })),
      });

      await newJob.save();
      res.redirect("/employerD/job_listings");
    } catch (error) {
      console.error("Error creating job listing:", error.message);
      res.status(500).send("Error creating job listing: " + error.message);
    }
  },

  getEditJobForm: async (req, res) => {
    try {
      const { jobId } = req.params;
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const job = await JobListing.findOne({ jobId, employerId }).lean();
      if (!job) {
        throw new Error("Job not found or you are not authorized to edit it");
      }

      res.render("Abhishek/others/update_job", {
        user: { name: req.session.user.name },
        activePage: "job_listings",
        job,
      });
    } catch (error) {
      console.error("Error fetching job for editing:", error.message);
      res.status(500).send("Error fetching job for editing: " + error.message);
    }
  },

  updateJobListing: async (req, res) => {
    try {
      const { jobId } = req.params;
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const {
        title,
        budget,
        imageUrl,
        location,
        jobType,
        experienceLevel,
        remote,
        applicationDeadline,
        description,
        milestones,
      } = req.body;

      const updatedJob = {
        imageUrl,
        title,
        budget: {
          amount: Number(budget.amount),
          period: budget.period,
        },
        location,
        jobType,
        experienceLevel,
        remote: remote === "true",
        applicationDeadline,
        description: {
          text: description.text,
          responsibilities: description.responsibilities
            .split("\n")
            .filter((r) => r.trim()),
          requirements: description.requirements
            .split("\n")
            .filter((r) => r.trim()),
          skills: description.skills.split("\n").filter((s) => s.trim()),
        },
        milestones: milestones.map((m) => ({
          description: m.description,
          deadline: m.deadline,
          payment: m.payment,
          status: m.status || "pending",
        })),
      };

      const job = await JobListing.findOneAndUpdate(
        { jobId, employerId },
        { $set: updatedJob },
        { new: true }
      );

      if (!job) {
        throw new Error("Job not found or you are not authorized to update it");
      }

      res.redirect("/employerD/job_listings");
    } catch (error) {
      console.error("Error updating job listing:", error.message);
      res.status(500).send("Error updating job listing: " + error.message);
    }
  },

  getJobApplications: async (req, res) => {
    try {
      const employerId = req.session?.user?.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const jobs = await JobListing.find({ employerId }).lean();
      const jobIds = jobs.map((job) => job.jobId);

      const applications = await JobApplication.find({
        jobId: { $in: jobIds },
      }).lean();

      const freelancerIds = [
        ...new Set(applications.map((app) => app.freelancerId)),
      ];
      const users = await User.find({ roleId: { $in: freelancerIds } })
        .select("roleId name picture")
        .lean();

      const applicationsWithDetails = applications.map((application) => {
        const job = jobs.find((job) => job.jobId === application.jobId);
        const user = users.find(
          (user) => user.roleId === application.freelancerId
        );
        return {
          ...application,
          jobTitle: job?.title || "Unknown Job",
          freelancerName: user?.name || "Unknown Freelancer",
          freelancerPicture: user?.picture || null,
        };
      });

      res.render("Abhishek/job_applications", {
        user: { name: req.session.user.name },
        activePage: "job_applications",
        applications: applicationsWithDetails,
      });
    } catch (error) {
      console.error("Error fetching job applications:", error.message);
      res.status(500).send("Error fetching job applications: " + error.message);
    }
  },

  acceptJobApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const application = await JobApplication.findOne({ applicationId });
      if (!application) {
        throw new Error("Application not found");
      }

      const job = await JobListing.findOne({ jobId: application.jobId });
      if (!job || job.employerId !== employerId) {
        throw new Error("Not authorized to modify this application");
      }

      await JobApplication.findOneAndUpdate(
        { applicationId },
        { $set: { status: "Accepted" } }
      );

      await JobListing.findOneAndUpdate(
        { jobId: application.jobId },
        {
          $set: {
            "assignedFreelancer.freelancerId": application.freelancerId,
            "assignedFreelancer.startDate": new Date(),
            "assignedFreelancer.status": "working",
            status: "closed",
          },
        }
      );

      res.redirect("/employerD/job_applications");
    } catch (error) {
      console.error("Error accepting job application:", error.message);
      res.status(500).send("Error accepting job application: " + error.message);
    }
  },

  rejectJobApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const employerId = req.session?.user?.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const application = await JobApplication.findOne({ applicationId });
      if (!application) {
        throw new Error("Application not found");
      }

      const job = await JobListing.findOne({ jobId: application.jobId });
      if (!job || job.employerId !== employerId) {
        throw new Error("Not authorized to modify this application");
      }

      await JobApplication.findOneAndUpdate(
        { applicationId },
        { $set: { status: "Rejected" } }
      );

      res.redirect("/employerD/job_applications");
    } catch (error) {
      console.error("Error rejecting job application:", error.message);
      res.status(500).send("Error rejecting job application: " + error.message);
    }
  },

  getProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const employerId = req.session.user.roleId;

      if (!userId || !employerId) {
        throw new Error("User ID or Employer roleId not found in session");
      }

      const user = await User.findOne({ userId }).lean();
      if (!user) {
        throw new Error("User not found");
      }

      const employer = await Employer.findOne({ employerId }).lean();
      if (!employer) {
        throw new Error("Employer not found");
      }

      res.render("Abhishek/profile", {
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          picture: user.picture,
          location: user.location,
          socialMedia: user.socialMedia,
          aboutMe: user.aboutMe,
          subscription: user.subscription,
          role: user.role,
        },
        company: {
          name: employer.companyName,
          website: employer.websiteLink,
        },
        activePage: "profile",
      });
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      res.status(500).send("Error fetching profile: " + error.message);
    }
  },

  getEditProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const employerId = req.session.user.roleId;

      if (!userId || !employerId) {
        throw new Error("User ID or Employer roleId not found in session");
      }

      const user = await User.findOne({ userId }).lean();
      if (!user) {
        throw new Error("User not found");
      }

      const employer = await Employer.findOne({ employerId }).lean();
      if (!employer) {
        throw new Error("Employer not found");
      }

      res.render("Abhishek/others/edit-profile", {
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          picture: user.picture,
          location: user.location,
          socialMedia: user.socialMedia,
          aboutMe: user.aboutMe,
          subscription: user.subscription,
          role: user.role,
        },
        company: {
          name: employer.companyName,
          website: employer.websiteLink,
        },
        activePage: "education",
      });
    } catch (error) {
      console.error("Error fetching edit profile:", error.message);
      res.status(500).send("Error fetching edit profile: " + error.message);
    }
  },

  updateProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const employerId = req.session.user.roleId;

      if (!userId || !employerId) {
        throw new Error("User ID or Employer roleId not found in session");
      }

      const {
        companyName,
        location,
        companyImageUrl,
        websiteLink,
        email,
        phone,
        linkedinUrl,
        twitterUrl,
        facebookUrl,
        instagramUrl,
        aboutContent,
      } = req.body;

      const userUpdate = {
        email,
        phone,
        picture: companyImageUrl,
        location,
        socialMedia: {
          linkedin: linkedinUrl || "",
          twitter: twitterUrl || "",
          facebook: facebookUrl || "",
          instagram: instagramUrl || "",
        },
        aboutMe: aboutContent,
      };

      const employerUpdate = {
        companyName,
        websiteLink,
      };

      const user = await User.findOneAndUpdate(
        { userId },
        { $set: userUpdate },
        { new: true }
      );
      if (!user) {
        throw new Error("User not found");
      }

      const employer = await Employer.findOneAndUpdate(
        { employerId },
        { $set: employerUpdate },
        { new: true }
      );
      if (!employer) {
        throw new Error("Employer not found");
      }

      req.session.user.name = user.name;
      req.session.user.email = user.email;

      res.redirect("/employerD/profile");
    } catch (error) {
      console.error("Error updating profile:", error.message);
      res.status(500).send("Error updating profile: " + error.message);
    }
  },

  getTransactionHistory: async (req, res) => {
    try {
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }
  
      // Fetch jobs where an assigned freelancer exists and status is either working or finished
      const jobs = await JobListing.find({
        employerId,
        status: "closed",
        "assignedFreelancer.freelancerId": { $ne: "" },
        "assignedFreelancer.status": { $in: ["working", "finished"] }
      }).lean();
  
      // Extract freelancer IDs from jobs
      const freelancerIds = jobs.map(job => job.assignedFreelancer.freelancerId).filter(id => id);
      
      // Fetch user details for the freelancers
      const users = await User.find({ roleId: { $in: freelancerIds } })
        .select("roleId name picture")
        .lean();
  
      // Map job data with freelancer information
      const transactions = jobs.map(job => {
        const user = users.find(u => u.roleId === job.assignedFreelancer.freelancerId);
        
        return {
          jobId: job.jobId,
          projectTitle: job.title,
          amount: job.budget.amount,
          startDate: job.assignedFreelancer.startDate,
          status: job.assignedFreelancer.status,
          freelancer: {
            id: job.assignedFreelancer.freelancerId,
            name: user?.name || "Unknown Freelancer",
            picture: user?.picture || "/assets/user_female.png"
          }
        };
      });
  
      res.render("Abhishek/transaction", {
        user: { name: req.session.user.name },
        activePage: "transaction_history",
        transactions: transactions
      });
    } catch (error) {
      console.error("Error fetching transaction history:", error.message);
      res.status(500).send("Error fetching transaction history: " + error.message);
    }
  },

  getMilestone: async (req, res) => {
    try {
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }
  
      // Check if specific jobId is provided in query params
      const { jobId } = req.query;
      const query = {
        employerId,
        "assignedFreelancer.freelancerId": { $ne: "" },
        "assignedFreelancer.status": { $in: ["working", "finished"] }
      };
  
      // If jobId is provided, add it to the query
      if (jobId) {
        query.jobId = jobId;
      }
  
      // Fetch jobs where assignedFreelancer.status is either working or finished
      const jobs = await JobListing.find(query).lean();
  
      const freelancerIds = jobs.map(job => job.assignedFreelancer.freelancerId).filter(id => id);
      const freelancers = await Freelancer.find({ freelancerId: { $in: freelancerIds } })
        .select("freelancerId skills")
        .lean();
      const users = await User.find({ roleId: { $in: freelancerIds } })
        .select("roleId name picture")
        .lean();
  
      // Calculate progress and map milestones
      const jobDetails = jobs.map(job => {
        const freelancer = freelancers.find(f => f.freelancerId === job.assignedFreelancer.freelancerId);
        const user = users.find(u => u.roleId === job.assignedFreelancer.freelancerId);
  
        const totalAmount = job.budget.amount;
        const paidAmount = job.milestones
          .filter(m => m.status === "paid")
          .reduce((sum, m) => sum + parseFloat(m.payment), 0);
        const paymentPercentage = Math.round((paidAmount / totalAmount) * 100);
        const completedMilestones = job.milestones.filter(m => m.status === "paid").length;
        const completionPercentage = Math.round((completedMilestones / job.milestones.length) * 100);
  
        return {
          jobId: job.jobId,
          title: job.title,
          freelancer: {
            id: job.assignedFreelancer.freelancerId,
            name: user?.name || "Unknown Freelancer",
            picture: user?.picture || "/assets/user_female.png",
          },
          milestones: job.milestones.map((m, index) => ({
            serialNo: index + 1,
            milestoneId: m.milestoneId,
            description: m.description,
            amount: parseFloat(m.payment),
            deadline: m.deadline,
            status: m.status,
          })),
          progress: {
            completionPercentage,
            payment: {
              paid: paidAmount,
              total: totalAmount,
              percentage: paymentPercentage,
            },
          },
        };
      });
  
      res.render("Abhishek/others/milestone", {
        user: {
          name: req.session.user.name,
          email: req.session.user.email,
        },
        activePage: "transaction_history",
        jobs: jobDetails,
      });
    } catch (error) {
      console.error("Error fetching milestones:", error.message);
      res.status(500).send("Error fetching milestones: " + error.message);
    }
  },

  getSubscription: async (req, res) => {
    try {
      const userId = req.session.user.id;
      if (!userId) {
        throw new Error("User ID not found in session");
      }

      const user = await User.findOne({ userId }).lean();
      if (!user) {
        throw new Error("User not found");
      }

      res.render("Abhishek/subscription", {
        user: {
          name: user.name,
          subscription: user.subscription || "Basic",
        },
        activePage: "subscription",
      });
    } catch (error) {
      console.error("Error fetching subscription:", error.message);
      res.status(500).send("Error fetching subscription: " + error.message);
    }
  },

  getMilestone: async (req, res) => {
    try {
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      // Fetch jobs where assignedFreelancer.status is either working or finished
      const jobs = await JobListing.find({
        employerId,
        "assignedFreelancer.freelancerId": { $ne: "" },
        "assignedFreelancer.status": { $in: ["working", "finished"] },
      }).lean();

      const freelancerIds = jobs.map(job => job.assignedFreelancer.freelancerId).filter(id => id);
      const freelancers = await Freelancer.find({ freelancerId: { $in: freelancerIds } })
        .select("freelancerId skills")
        .lean();
      const users = await User.find({ roleId: { $in: freelancerIds } })
        .select("roleId name picture")
        .lean();

      // Calculate progress and map milestones
      const jobDetails = jobs.map(job => {
        const freelancer = freelancers.find(f => f.freelancerId === job.assignedFreelancer.freelancerId);
        const user = users.find(u => u.roleId === job.assignedFreelancer.freelancerId);

        const totalAmount = job.budget.amount;
        const paidAmount = job.milestones
          .filter(m => m.status === "paid")
          .reduce((sum, m) => sum + parseFloat(m.payment), 0);
        const paymentPercentage = Math.round((paidAmount / totalAmount) * 100);
        const completedMilestones = job.milestones.filter(m => m.status === "paid").length;
        const completionPercentage = Math.round((completedMilestones / job.milestones.length) * 100);

        return {
          jobId: job.jobId,
          title: job.title,
          freelancer: {
            id: job.assignedFreelancer.freelancerId,
            name: user?.name || "Unknown Freelancer",
            picture: user?.picture || "/assets/user_female.png",
          },
          milestones: job.milestones.map((m, index) => ({
            serialNo: index + 1,
            milestoneId: m.milestoneId,
            description: m.description,
            amount: parseFloat(m.payment),
            deadline: m.deadline,
            status: m.status,
          })),
          progress: {
            completionPercentage,
            payment: {
              paid: paidAmount,
              total: totalAmount,
              percentage: paymentPercentage,
            },
          },
        };
      });

      res.render("Abhishek/others/milestone", {
        user: {
          name: req.session.user.name,
          email: req.session.user.email,
        },
        activePage: "transaction_history",
        jobs: jobDetails,
      });
    } catch (error) {
      console.error("Error fetching milestones:", error.message);
      res.status(500).send("Error fetching milestones: " + error.message);
    }
  },

  payMilestone: async (req, res) => {
    try {
      const { jobId, milestoneId } = req.params;
      const employerId = req.session.user.roleId;
      if (!employerId) {
        throw new Error("Employer roleId not found in session");
      }

      const job = await JobListing.findOne({ jobId, employerId });
      if (!job) {
        throw new Error("Job not found or you are not authorized");
      }

      const milestone = job.milestones.find(m => m.milestoneId === milestoneId);
      if (!milestone) {
        throw new Error("Milestone not found");
      }

      milestone.status = "paid";
      await job.save();

      res.json({ success: true });
    } catch (error) {
      console.error("Error paying milestone:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getViewprofile: (req, res) => {
    res.render("Abhishek/others/view_profile", {
      user: { name: req.session.user.name },
      activePage: "transaction_history",
    });
  },
};

module.exports = employerController;