const express = require('express');
const protect = require('../middlewares/authMiddleware');
const { storeOrUpdateUserName, getUserName } = require('../controllers/userController');

const router = express.Router();
router.put('/userDetails',protect,storeOrUpdateUserName);
router.get('/getUserDetails',protect,getUserName);
module.exports=router;