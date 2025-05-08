const path = require("path");
const fs = require("fs").promises;
const User = require("../models/user");
const Employer = require("../models/employer");
const Freelancer = require("../models/freelancer");
const JobListing = require("../models/job_listing");
const Skill = require("../models/skill");

exports.getAdminDashboard = (req, res) => {
  res.redirect("/adminD/profile");
};

exports.getJobListings = async (req, res) => {
  try {
    const jobs = await JobListing.find().lean();
    const employerIds = [...new Set(jobs.map((job) => job.employerId))];
    const employers = await Employer.find({
      employerId: { $in: employerIds },
    }).lean();

    const employerMap = employers.reduce((map, employer) => {
      map[employer.employerId] = employer.companyName || "Unknown Company";
      return map;
    }, {});

    const jobData = jobs.map((job) => ({
      ...job,
      companyName: employerMap[job.employerId] || "Unknown Company",
      formattedBudget: `₹${job.budget.amount}/${job.budget.period}`,
      formattedDate: new Date(job.postedDate).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

    res.render("Jayanth/job_listings", {
      user: req.session.user,
      activeSection: "job_listings",
      jobs: jobData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

exports.getFreelancers = async (req, res) => {
  try {
    const searchQuery = req.query.q ? req.query.q.trim() : "";
    console.log(`Search query received: "${searchQuery}"`);

    const freelancers = await User.find({ role: "Freelancer" }).lean();
    console.log(`Found ${freelancers.length} freelancers in User collection`);

    const freelancerDetails = await Freelancer.find({
      userId: { $in: freelancers.map((f) => f.userId) },
    }).lean();
    console.log(`Found ${freelancerDetails.length} freelancer details`);

    const freelancerData = freelancers
      .map((user) => {
        const details = freelancerDetails.find((d) => d.userId === user.userId);
        const skills = details
          ? details.skills
              .map((s) => (typeof s === "object" && s.skillId ? s.skillId : s))
              .filter(Boolean)
              .join(", ")
          : "";
        return {
          ...user,
          skills,
        };
      })
      .filter((freelancer) => {
        if (!searchQuery) return true;
        const nameMatch = freelancer.name
          ? freelancer.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false;
        const skillsMatch = freelancer.skills
          ? freelancer.skills.toLowerCase().includes(searchQuery.toLowerCase())
          : false;
        return nameMatch || skillsMatch;
      });

    console.log(`Filtered to ${freelancerData.length} freelancers`);

    res.render("Jayanth/freelancers", {
      user: req.session.user,
      activeSection: "freelancers",
      freelancers: freelancerData,
      searchQuery,
    });
  } catch (error) {
    console.error("Error in getFreelancers:", error);
    res.status(500).send("Server error");
  }
};

exports.getEmployers = async (req, res) => {
  try {
    const searchQuery = req.query.q ? req.query.q.trim() : "";
    console.log(`Employer search query received: "${searchQuery}"`);

    const employers = await User.find({ role: "Employer" }).lean();
    console.log(`Found ${employers.length} employers in User collection`);

    const employerDetails = await Employer.find({
      userId: { $in: employers.map((e) => e.userId) },
    }).lean();
    console.log(`Found ${employerDetails.length} employer details`);

    const employerData = employers
      .map((user) => {
        const details = employerDetails.find((d) => d.userId === user.userId);
        return {
          ...user,
          companyName: details ? details.companyName : "",
        };
      })
      .filter((employer) => {
        if (!searchQuery) return true;
        const nameMatch = employer.name
          ? employer.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false;
        const companyNameMatch = employer.companyName
          ? employer.companyName.toLowerCase().includes(searchQuery.toLowerCase())
          : false;
        return nameMatch || companyNameMatch;
      });

    console.log(`Filtered to ${employerData.length} employers`);

    res.render("Jayanth/employers", {
      user: req.session.user,
      activeSection: "employers",
      employers: employerData,
      searchQuery,
    });
  } catch (error) {
    console.error("Error in getEmployers:", error);
    res.status(500).send("Server error");
  }
};

exports.getComplaints = (req, res) => {
  res.render("Jayanth/complaints", {
    user: req.session.user,
    activeSection: "complaints",
  });
};

exports.getQuizzes = async (req, res) => {
  try {
    const searchQuery = req.query.q ? req.query.q.trim() : "";
    
    let query = {};
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: 'i' };
    }
    
    const skills = await Skill.find(query).lean();
    
    const skillData = skills.map((skill) => ({
      ...skill,
      questionCount: skill.questions.length,
      totalMarks: skill.questions.reduce((sum, q) => sum + q.marks, 0),
    }));
    
    res.render("Jayanth/quizzes", {
      user: req.session.user,
      activeSection: "quizzes",
      skills: skillData,
      searchQuery,
    });
  } catch (error) {
    console.error("Error in getQuizzes:", error);
    res.status(500).send("Server error");
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.session.user.id });
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("Jayanth/profile", {
      user: user,
      activeSection: "profile",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

exports.getEditProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.session.user.id });
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("Jayanth/others/edit-profile", {
      user: user,
      activeSection: "profile",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      location,
      picture,
      email,
      phone,
      linkedin,
      twitter,
      facebook,
      instagram,
      aboutMe,
    } = req.body;

    const updateData = {
      name,
      location,
      picture,
      email,
      phone,
      socialMedia: {
        linkedin,
        twitter,
        facebook,
        instagram,
      },
      aboutMe,
    };

    const user = await User.findOneAndUpdate(
      { userId: req.session.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.session.user = {
      ...req.session.user,
      name: user.name,
      email: user.email,
      phone: user.phone,
      picture: user.picture,
      location: user.location,
      socialMedia: user.socialMedia,
      aboutMe: user.aboutMe,
    };

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteEmployer = async (req, res) => {
  try {
    const userId = req.params.userId;
    await User.deleteOne({ userId, role: "Employer" });
    await Employer.deleteOne({ userId });
    res.json({ message: "Employer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteFreelancer = async (req, res) => {
  try {
    const userId = req.params.userId;
    await User.deleteOne({ userId, role: "Freelancer" });
    await Freelancer.deleteOne({ userId });
    res.json({ message: "Freelancer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAddQuiz = (req, res) => {
  res.render("Jayanth/others/add-quiz", {
    user: req.session.user,
    activeSection: "quizzes",
  });
};

exports.addQuiz = async (req, res) => {
  try {
    const { name, questions } = req.body;
    
    const parsedQuestions = typeof questions === 'string' 
      ? JSON.parse(questions) 
      : questions;
    
    const newSkill = new Skill({
      name,
      questions: parsedQuestions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: parseInt(q.marks) || 1
      }))
    });
    
    await newSkill.save();
    res.redirect("/adminD/quizzes");
  } catch (error) {
    console.error("Error adding quiz:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const result = await Skill.deleteOne({ skillId: req.params.skillId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Skill not found" });
    }
    
    res.json({ message: "Skill and quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getEditQuiz = async (req, res) => {
  try {
    const skill = await Skill.findOne({ skillId: req.params.skillId }).lean();
    if (!skill) {
      return res.status(404).send("Skill not found");
    }
    res.render("Jayanth/others/edit-quiz", {
      user: req.session.user,
      activeSection: "quizzes",
      skill,
    });
  } catch (error) {
    console.error("Error in getEditQuiz:", error);
    res.status(500).send("Server error");
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { name, questions } = req.body;
    const parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

    const updatedSkill = await Skill.findOneAndUpdate(
      { skillId: req.params.skillId },
      {
        name,
        questions: parsedQuestions.map(q => ({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: parseInt(q.marks) || 1,
        })),
      },
      { new: true, runValidators: true }
    );

    if (!updatedSkill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    res.redirect("/adminD/quizzes");
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};