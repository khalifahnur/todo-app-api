const express = require("express");
const bodyParser = require("body-parser");
const firebaseAdmin = require("firebase-admin");

require("dotenv").config();
console.log(process.env);

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// Check if the service account key is provided
if (!serviceAccount) {
  console.error(
    "FIREBASE_SERVICE_ACCOUNT_KEY is missing in the environment variables."
  );
  process.exit(1); // Exit the process if the service account key is missing
}

// Parse the service account key JSON
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(serviceAccount);
} catch (error) {
  console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error.message);
  process.exit(1); // Exit the process if the service account key is invalid
}

// Initialize Firebase Admin SDK
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(firebaseConfig),
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

app.get("/", async (req, res) => {
  res.send("Server is running");
});

app.post("/login", async (req, res) => {
  const { idToken } = req.body;
  console.log(req.body);
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    res.status(200).json({ uid });
  } catch (e) {
    console.log("Error verifying ID token:", e);
    res.status(400).json({ error: "Invalid ID token" });
  }
});

app.post("/signup", async (req, res) => {
  const { email, psswd, displayName, phoneNumber } = req.body;

  try {
    const createdUser = await firebaseAdmin
      .auth()
      .createUser({
        email,
        psswd,
        phoneNumber,
        displayName,
        emailVerified: true,
        disabled: false,
      });
    const userRecord = await firebaseAdmin.auth().getUser(createdUser.uid);
    //await userRecord.sendEmailVerification();

    // Store the email and phone number in Firestore
    await firebaseAdmin
      .firestore()
      .collection("user")
      .doc(userRecord.uid)
      .set({ email, phone: phoneNumber });

    res.status(200).json({ user: userRecord });
  } catch (e) {
    console.error("Error creating user:", e);
    res.status(400).json({ error: "Could not create user" });
  }
});

//notification
app.post("/sendNotification", (req, res) => {
  const { registrationToken } = req.body;

  // Define the message payload
  const message = {
    notification: {
      title: "Hello from Firebase!",
      body: "This is a test notification",
    },
    token: registrationToken,
  };

  // Send the message
  firebaseAdmin
    .messaging()
    .send(message)
    .then((response) => {
      // Response is a message ID string
      console.log("Successfully sent message:", response);
      res.status(200).json({ success: true, messageId: response });
    })
    .catch((error) => {
      console.log("Error sending message:", error);
      res.status(400).json({ success: false, error });
    });
});

//Add todo
app.post("/submitTask", async (req, res) => {
  try {
    const db = firebaseAdmin.firestore();
    const { taskId, taskGroup, todo, desc, startTime, endDate, userID } =
      req.body;
    //  console.log(req.body)
    if (taskId == "") {
      return res
        .status(400)
        .json({ error: "Missing required taskId in request body" });
    } else if (taskGroup == "") {
      return res
        .status(400)
        .json({ error: "Missing required Taskgroup in request body" });
    } else if (todo == "") {
      return res
        .status(400)
        .json({ error: "Missing required todo in request body" });
    } else if (desc == "") {
      return res
        .status(400)
        .json({ error: "Missing required desc in request body" });
    } else if (startTime == "") {
      return res
        .status(400)
        .json({ error: "Missing required startTime in request body" });
    } else if (endDate == "") {
      return res
        .status(400)
        .json({ error: "Missing required endDate in request body" });
    } else if (userID == "") {
      return res
        .status(400)
        .json({ error: "Missing required userID in request body" });
    }

    const collectionName = "tasks";
    // console.log(`Start Time: ${startTime}`);
    // console.log(`End Date: ${endDate}`);

    const startTimeDate = new Date(startTime);
    const endDateDate = new Date(endDate);

    // console.log(`Parsed Start Time: ${startTimeDate}`);
    // console.log(`Parsed End Date: ${endDateDate}`);

    if (isNaN(startTimeDate) || isNaN(endDateDate)) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    //const startTimeTimestamp = db.Timestamp.fromDate(startTimeDate);
    //const endDateTimestamp = db.Timestamp.fromDate(endDateDate);

    //console.log(`timestamp : ${startTimeTimestamp}`)

    await db.collection(collectionName).doc(taskId).set({
      id: taskId,
      taskGroup,
      todo,
      desc,
      startTime: startTimeDate,
      endDate: endDateDate,
      status: "",
      uid: userID,
    });

    res.status(200).json({ message: "Task added successfully" });
  } catch (error) {
    console.error("Error occurred when storing in Firestore:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;
