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

module.exports = router;