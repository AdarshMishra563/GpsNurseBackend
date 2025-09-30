const UserName = require('../models/Username');
const { encrypt, decrypt } = require('../utils/encryption'); // make sure you have both

exports.storeOrUpdateUserName = async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    const userId = req.user.id; // From protect middleware

    // Check if a name record already exists for this user
    let userName = await UserName.findOne({ userId });

    if (userName) {
      // Update existing record
      userName.firstName = firstName;
      userName.lastName = lastName;
      await userName.save();

      return res.status(200).json({
        message: 'Name updated successfully',
        userName: {
          id: userName._id,
          firstName,
          lastName,
          userId,
        },
      });
    }

    // If not exists, create new record
    userName = await UserName.create({
      userId,
      firstName,
      lastName,
    });

    res.status(201).json({
      message: 'Name stored successfully',
      userName: {
        id: userName._id,
        firstName,
        lastName,
        userId,
      },
    });
  } catch (err) {
    next(err);
  }
};
// assuming you have a decrypt function

exports.getUserName = async (req, res, next) => {
  try {
    const userId = req.user.id; // From protect middleware

    // Find the user's name record
    const userName = await UserName.findOne({ userId });

    if (!userName) {
      return res.status(404).json({ message: 'Name not found for this user' });
    }

    // Decrypt first and last name before sending (if using encryption)
    const firstName = decrypt(userName.firstName);
    const lastName = decrypt(userName.lastName);

    res.status(200).json({
      userName: {
        id: userName._id,
        firstName,
        lastName,
        userId,
      },
    });
  } catch (err) {
    next(err);
  }
};
