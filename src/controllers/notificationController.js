const admin = require("../config/firebase");
const Nurse = require("../models/Nurse");
const User = require("../models/User");

exports.sendNotification = async (req, res) => {
  try {
    const {
      id,
      role = "user",
      type,
      bookingId,
      amount,
      distance,
      from,
      message,
      userId,
      userName,
      latitude,
      longitude
    } = req.body;

    console.log(req.body);

    if (!id || !type) {
      return res.status(400).json({ message: "id and type are required" });
    }

    // Find Nurse or User
    let receiver;
    if (role === "nurse") {
      receiver = await Nurse.findById(id).lean();
    } else {
      receiver = await User.findById(id).lean();
    }

    if (!receiver || !receiver.fcm) {
      return res.status(404).json({ message: "Receiver not found or no FCM token" });
    }

    // Build payload data
    let data = { type };

    if (type === "newBooking") {
      if (!bookingId) {
        return res.status(400).json({ message: "bookingId is required for newBooking" });
      }
      data = {
        ...data,
        bookingId: String(bookingId),
        amount: amount ? String(amount) : "0",
        distance: distance ? String(distance) : "0",
        userId: userId ? String(userId) : "",
        userName: userName || "",
        latitude: latitude ? String(latitude) : "0",
        longitude: longitude ? String(longitude) : "0",
      };
    }

    if (type === "bookingCancelled" || type === "bookingCompleted") {
      if (!bookingId) {
        return res.status(400).json({ message: "bookingId is required for this type" });
      }
      data.bookingId = String(bookingId);
    }

    if (type === "newMessage") {
      if (bookingId) data.bookingId = String(bookingId);
      if (from) data.from = String(from);
      if (message) data.message = message;
    }

    const fcmToken = receiver.fcm;

    const messagePayload = {
      token: fcmToken,
      notification: {
        title:
          type === "newBooking"
            ? "New Booking Request"
            : type === "bookingCancelled"
            ? "Booking Cancelled"
            : type === "bookingCompleted"
            ? "Booking Completed"
            : type === "newMessage"
            ? "New Message"
            : "Notification",
        body: type === "newBooking"
          ? `New booking at ${data.distance} km away - $${data.amount}`
          : message || "You have a new notification",
      },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
    };

    const response = await admin.messaging().send(messagePayload);

    return res.status(200).json({
      success: true,
      messageId: response,
      data: messagePayload.data,
      notification: messagePayload.notification,
      receiver: {
        id: receiver._id,
        name: receiver.name || "",
      },
    });
  } catch (error) {
    console.error("FCM error:", error);
    return res.status(500).json({ error: error.message });
  }
};
