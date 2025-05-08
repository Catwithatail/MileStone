const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.get("/", adminController.getAdminDashboard);
router.get("/job_listings", adminController.getJobListings);
router.get("/freelancers", adminController.getFreelancers);
router.get("/employers", adminController.getEmployers);
router.get("/complaints", adminController.getComplaints);
router.get("/profile", adminController.getProfile);
router.get("/profile/edit", adminController.getEditProfile);
router.post("/profile/edit", adminController.updateProfile);
router.delete("/employers/:userId", adminController.deleteEmployer);
router.delete("/freelancers/:userId", adminController.deleteFreelancer);

// New quiz routes
router.get("/quizzes", adminController.getQuizzes);
router.get("/quizzes/add", adminController.getAddQuiz);
router.post("/quizzes/add", adminController.addQuiz);
router.delete("/quizzes/:skillId", adminController.deleteQuiz);
router.get("/quizzes/edit/:skillId", adminController.getEditQuiz);
router.post("/quizzes/edit/:skillId", adminController.updateQuiz);

module.exports = router;
