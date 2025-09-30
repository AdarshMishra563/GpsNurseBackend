const admin = require("../config/firebase");

exports.sendNotification = async (req, res) => {
  try {
    const { fcmToken, title, body, data } = req.body;
console.log(fcmToken)
    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    const message = {
      token: fcmToken,
      notification: {
        title: title || "Default Title",
        body: body || "Default Body",
      },
      data: data || {}, // optional extra data
    };

    const response = await admin.messaging().send(message);

    return res.status(200).json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error("FCM error:", error);
    return res.status(500).json({ error: error.message });
  }
};
