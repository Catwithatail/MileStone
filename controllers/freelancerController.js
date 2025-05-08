const mongoose = require("../database");
const JobListing = require("../models/job_listing");
const User = require("../models/user");
const Employer = require("../models/employer");
const Freelancer = require("../models/freelancer");
const Skill = require("../models/skill");

exports.getFreelancerActiveJobs = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("Unauthorized: Please log in");
    }

    const freelancerId = req.session.user.roleId;

    const activeJobs = await JobListing.find({
      "assignedFreelancer.freelancerId": freelancerId,
      "assignedFreelancer.status": "working",
    }).lean();

    const formattedJobs = await Promise.all(
      activeJobs.map(async (job) => {
        const paidAmount = job.milestones
          .filter((milestone) => milestone.status === "paid")
          .reduce(
            (sum, milestone) => sum + parseFloat(milestone.payment) || 0,
            0
          );

        const totalBudget = parseFloat(job.budget.amount) || 0;
        const progress =
          totalBudget > 0 ? Math.min((paidAmount / totalBudget) * 100, 100) : 0;

        const employer = await Employer.findOne({
          employerId: job.employerId,
        }).lean();
        const companyName = employer ? employer.companyName : "Unknown Company";

        return {
          id: job.jobId,
          title: job.title,
          company: companyName,
          logo: job.imageUrl || "/assets/company_logo.jpg",
          deadline: job.applicationDeadline
            ? job.applicationDeadline.toLocaleDateString()
            : "No deadline",
          price: job.budget.amount
            ? `Rs.${parseFloat(job.budget.amount).toFixed(2)}`
            : "Not specified",
          progress: Math.round(progress),
          tech: job.description.skills || [],
        };
      })
    );

    res.render("Vanya/active_job", {
      user: req.session.user,
      active_jobs: formattedJobs,
      activePage: "active_job",
    });
  } catch (error) {
    console.error("Error fetching active jobs:", error.message);
    res.status(500).send("Server Error: Unable to load active jobs");
  }
};

exports.leaveActiveJob = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized: Please log in" });
    }

    const freelancerId = req.session.user.roleId;
    const jobId = req.params.jobId;

    const result = await JobListing.updateOne(
      {
        jobId: jobId,
        "assignedFreelancer.freelancerId": freelancerId,
        "assignedFreelancer.status": "working",
      },
      { $set: { "assignedFreelancer.status": "left" } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Job not found or not authorized" });
    }

    res.status(200).json({ message: "Job left successfully" });
  } catch (error) {
    console.error("Error leaving active job:", error.message);
    res.status(500).json({ error: "Failed to leave job" });
  }
};

exports.getFreelancerProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      throw new Error("Unauthorized: Please log in");
    }

    const userId = req.session.user.id;
    const freelancerId = req.session.user.roleId;

    if (!userId || !freelancerId) {
      throw new Error("User ID or Freelancer roleId not found in session");
    }

    const user = await User.findOne({ userId }).lean();
    if (!user) {
      throw new Error("User not found");
    }

    const freelancer = await Freelancer.findOne({ freelancerId }).lean();
    if (!freelancer) {
      throw new Error("Freelancer profile not found");
    }

    // Fetch skill names based on skillIds in freelancer.skills
    const skillIds = (freelancer.skills || []).map(skill => skill.skillId);
    const skills = await Skill.find({ skillId: { $in: skillIds } }).lean();
    const skillNames = skills.map(skill => skill.name);

    await res.render("Vanya/profile", {
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
        skills: skillNames, // Pass skill names instead of raw skill objects
        experience: freelancer.experience || [],
        education: freelancer.education || [],
        portfolio: freelancer.portfolio || [],
        resume: freelancer.resume || "",
      },
      activePage: "profile",
    });
  } catch (error) {
    console.error("Error fetching profile:", error.message);
    res.status(500).send("Error fetching profile: " + error.message);
  }
};

exports.getEditFreelancerProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("Unauthorized: Please log in");
    }

    const freelancerId = req.session.user.roleId;

    const user = await User.findOne({ roleId: freelancerId }).lean();
    if (!user) {
      return res.status(404).send("User not found");
    }

    const freelancer = await Freelancer.findOne({
      freelancerId: freelancerId,
    }).lean();
    if (!freelancer) {
      return res.status(404).send("Freelancer profile not found");
    }

    const profileData = {
      ...user,
      ...freelancer,
    };

    res.render("Vanya/others/edit-profile", {
      user: profileData,
      activePage: "profile",
    });
  } catch (error) {
    console.error("Error rendering edit profile:", error.message);
    res.status(500).send("Server Error: Unable to render edit profile page");
  }
};

exports.updateFreelancerProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized: Please log in" });
    }

    const freelancerId = req.session.user.roleId;
    const {
      name,
      title,
      location,
      profileImageUrl,
      email,
      phone,
      about,
      experience,
      education,
      portfolio,
      resumeLink,
      skills,
    } = req.body;

    const userUpdate = await User.updateOne(
      { roleId: freelancerId },
      {
        $set: {
          name,
          email,
          phone,
          location,
          picture: profileImageUrl,
          aboutMe: about,
        },
      }
    );

    if (userUpdate.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const parsedExperience =
      typeof experience === "string" ? JSON.parse(experience) : experience;
    const parsedEducation =
      typeof education === "string" ? JSON.parse(education) : education;
    const parsedPortfolio =
      typeof portfolio === "string" ? JSON.parse(portfolio) : portfolio;
    const parsedSkills =
      typeof skills === "string" ? JSON.parse(skills) : skills;

    const freelancerUpdate = await Freelancer.updateOne(
      { freelancerId: freelancerId },
      {
        $set: {
          resume: resumeLink,
          skills: parsedSkills || [],
          experience: parsedExperience || [],
          education: parsedEducation || [],
          portfolio: parsedPortfolio || [],
        },
      }
    );

    if (freelancerUpdate.matchedCount === 0) {
      return res.status(404).json({ error: "Freelancer profile not found" });
    }

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    res.status(500).json({ error: "Server Error: Unable to update profile" });
  }
};

exports.getFreelancerJobHistory = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("Unauthorized: Please log in");
    }

    const freelancerId = req.session.user.roleId;

    const historyJobs = await JobListing.find({
      "assignedFreelancer.freelancerId": freelancerId,
      "assignedFreelancer.status": { $in: ["finished", "left"] },
    }).lean();

    const formattedJobs = await Promise.all(
      historyJobs.map(async (job) => {
        const paidAmount = job.milestones
          .filter((milestone) => milestone.status === "paid")
          .reduce(
            (sum, milestone) => sum + parseFloat(milestone.payment) || 0,
            0
          );

        const employer = await Employer.findOne({
          employerId: job.employerId,
        }).lean();
        const companyName = employer ? employer.companyName : "Unknown Company";

        return {
          id: job.jobId,
          title: job.title,
          company: companyName,
          logo: job.imageUrl || "/assets/company_logo.jpg",
          status: job.assignedFreelancer.status,
          tech: job.description.skills || [],
          date: `${
            job.assignedFreelancer.startDate
              ? job.assignedFreelancer.startDate.toLocaleDateString()
              : "Unknown"
          } - ${
            job.updatedAt ? job.updatedAt.toLocaleDateString() : "Unknown"
          }`,
          price: paidAmount ? `Rs.${paidAmount.toFixed(2)}` : "Not paid",
          rating: job.rating || 0,
        };
      })
    );

    res.render("Vanya/job_history", {
      user: req.session.user,
      history_jobs: formattedJobs,
      activePage: "job_history",
    });
  } catch (error) {
    console.error("Error rendering job history:", error.message);
    res.status(500).send("Server Error: Unable to render job history page");
  }
};

exports.getFreelancerPayment = async (req, res) => {
  try {
    res.render("Vanya/payment", {
      user: req.session.user || staticUser,
      activePage: "payment",
    });
  } catch (error) {
    console.error("Error rendering payment:", error.message);
    res.status(500).send("Server Error: Unable to render payment page");
  }
};

exports.getFreelancerSkills = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("Unauthorized: Please log in");
    }

    const freelancerId = req.session.user.roleId;

    // Fetch freelancer's skills
    const freelancer = await Freelancer.findOne({ freelancerId }).lean();
    if (!freelancer) {
      return res.status(404).send("Freelancer profile not found");
    }

    // Fetch all skills from the database
    const allSkills = await Skill.find().lean();

    // Fetch skill names for freelancer's skills
    const freelancerSkillIds = freelancer.skills.map((skill) => skill.skillId);
    const freelancerSkills = await Skill.find({
      skillId: { $in: freelancerSkillIds },
    }).lean();

    // Map all skills with quiz availability
    const skillsData = allSkills.map((skill) => ({
      skillId: skill.skillId,
      name: skill.name,
      hasQuiz: skill.questions && skill.questions.length > 0,
      isAcquired: freelancerSkillIds.includes(skill.skillId),
    }));

    res.render("Vanya/skills_badges", {
      user: req.session.user,
      skills: skillsData,
      freelancerSkills: freelancerSkills.map((skill) => skill.name),
      activePage: "skills_badges",
    });
  } catch (error) {
    console.error("Error rendering skills_badges:", error.message);
    res.status(500).send("Server Error: Unable to render skills page");
  }
};

exports.getFreelancerSubscription = async (req, res) => {
  try {
    res.render("Vanya/subscription", {
      user: req.session.user || staticUser,
      activePage: "subscription",
    });
  } catch (error) {
    console.error("Error rendering subscription:", error.message);
    res.status(500).send("Server Error: Unable to render subscription page");
  }
};

exports.getSkillQuiz = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("Unauthorized: Please log in");
    }

    const skillId = req.params.skillId;
    const skill = await Skill.findOne({ skillId }).lean();

    if (!skill) {
      return res.status(404).send("Skill not found");
    }

    if (!skill.questions || skill.questions.length === 0) {
      return res.status(400).send("No quiz available for this skill");
    }

    res.render("Vanya/quiz", {
      user: req.session.user,
      skill: {
        skillId: skill.skillId,
        name: skill.name,
        questions: skill.questions,
      },
      activePage: "skills_badges",
    });
  } catch (error) {
    console.error("Error rendering quiz:", error.message);
    res.status(500).send("Server Error: Unable to render quiz page");
  }
};

exports.submitSkillQuiz = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized: Please log in" });
    }

    const skillId = req.params.skillId;
    const freelancerId = req.session.user.roleId;
    const answers = req.body;

    console.log('Skill ID:', skillId);
    console.log('Freelancer ID:', freelancerId);
    console.log('Submitted Answers:', answers);

    const skill = await Skill.findOne({ skillId }).lean();
    if (!skill || !skill.questions || skill.questions.length === 0) {
      return res.status(404).json({ error: "Skill or quiz not found" });
    }

    let totalMarks = 0;
    let earnedMarks = 0;

    skill.questions.forEach((question) => {
      const userAnswer = answers[question.questionId];
      totalMarks += question.marks;

      if (userAnswer && userAnswer === question.correctAnswer) {
        earnedMarks += question.marks;
      }
    });

    const scorePercentage = (earnedMarks / totalMarks) * 100;
    const passed = scorePercentage >= 80;

    if (passed) {
      await Freelancer.updateOne(
        { freelancerId },
        { $addToSet: { skills: { skillId } } }
      );
    }

    res.json({
      success: true,
      passed,
      message: passed ? "Well Done!" : "Better Luck Next Time!",
      score: Math.round(scorePercentage),
    });
  } catch (error) {
    console.error("Error submitting quiz:", error.message);
    res.status(500).json({ error: "Server Error: Unable to submit quiz" });
  }
};