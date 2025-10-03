const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const admin = require('../config/firebase');
const { encrypt } = require('../utils/encryption');

exports.loginUser = async (req, res, next) => {
  try {
    const { phone, firebaseToken } = req.body;
console.log(phone)
    if (!phone && !firebaseToken) {
      return res.status(400).json({ message: 'Phone or Firebase token required' });
    }

    let user;

    
    if (firebaseToken) {
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const { email, name } = decodedToken;
      const encryptedEmail = encrypt(email);
      const encryptedName = encrypt(name);

      user = await User.findOne({ email: encryptedEmail });

      if (user) {
        return res.status(200).json({
          existing: true,
          token: generateToken(user._id),
        });
      }

      user = await User.create({ email: encryptedEmail, name: encryptedName });
      return res.status(201).json({
        existing: false,
        token: generateToken(user._id),
      });
    }

    // --- Phone login ---
    if (phone) {
      const encryptedPhone = encrypt(phone);
console.log(encryptedPhone);
      user = await User.findOne({ phone: encryptedPhone });

      if (user) {
        return res.status(200).json({
          existing: false,
          token: generateToken(user._id),
        });
      }

      user = await User.create({ phone: encryptedPhone });
      return res.status(201).json({
        existing: false,
        token: generateToken(user._id),
      });
    }
  } catch (err) {
    next(err);
  }
};
