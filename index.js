import express from "express";
import cors from "cors";
import NodeMailer from "nodemailer";
import dotenv from "dotenv";
import stripeRoutes, { sendSMS } from "./routes/stripeRoutes.js";
import bodyParser from "body-parser";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env" });
const PORT = process.env.PORT || 8000;
const app = express();
// app.use(express.urlencoded())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = NodeMailer.createTransport({
  host: process.env.SMPT_HOST,
  port: process.env.SMPT_PORT,
  debug: true,
  auth: {
    user: process.env.SMPT_LOGIN,
    pass: process.env.SMPT_KEY,
  },
});

const send_email = (to, subject, content) => {
  console.log(`to: ${to}, subject: ${subject}`);
  transporter.sendMail(
    {
      from: "LiftInfluence hello@liftinfluence.com",
      to,
      subject,
      html: content,
      sender: { name: "LiftInfluence", email: "hello@liftinfluence.com" },
    },
    (error, info) => {
      if (error) {
        console.log(error);
        return { success: false, message: error };
      } else {
        console.log("email sent to: " + info.accepted[0]);
        return { success: true, message: info.response };
      }
    }
  );
};

app.post("/api/send_email", async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent);
  res.send({ success: true, message: "Email sent successfully" });
});

export function getDownloadedFilePublicUrl(path) {
  const publicUrl = supabase.storage.from("profilePictures").getPublicUrl(path);
  return publicUrl;
}

app.post("/api/image-fetch", async (req, res) => {
  function formatString(inputString) {
    // Define a regular expression to match non-alphanumeric characters and emojis
    const regex = /[^a-zA-Z0-9]+/g;

    // Remove non-alphanumeric characters from the input string
    const formattedString = inputString.replace(regex, "");
    return formattedString;
  }

  const { image, username } = req.body;

  console.log("image, username");
  console.log(image, username);

  try {
    const response = await fetch(image);
    if (!response.ok) {
      throw new Error("Failed to fetch image");
      // res.send("Internal Server Error").status(500);
    }

    const imageData = await response?.blob();
    const contentType = response.headers.get("content-type") || undefined;

    if (imageData) {
      // Upload image to Supabase storage
      const { data, error } = await supabase.storage
        .from("profilePictures")
        .upload(`${formatString(username)}.jpg`, imageData, {
          upsert: true,
          contentType,
        });

      if (error) {
        console.log(error);
        // res.send("Internal Server Error").status(500);
        throw new Error(error.message);
      } else {
        // console.log(`Image uploaded to ${data}`);
        const publicUrl = getDownloadedFilePublicUrl(data.path);
        // console.log("publicUrl: ", publicUrl?.data?.publicUrl)
        return res
          .send({ status: "success", data: publicUrl?.data?.publicUrl })
          .status(200);
      }
    }
    res.status(500).send("Internal Server Error");
  } catch (error) {
    console.error("Error fetching image:", error.message);
    // res.send("Internal Server Error").status(500);
    return res.send({ status: "failed", data: error.message }).status(200);
  }
});

// var Brevo = require('@getbrevo/brevo');
// import Brevo from '@getbrevo/brevo'

// https://developers.brevo.com/reference/sendtransacsms

// var campaignId = 789; // Number | Id of the SMS campaign

// var phoneNumber = new Brevo.SendTestSms(); // SendTestSms | Mobile number of the recipient with the country code. This number must belong to one of your contacts in Brevo account and must not be blacklisted

// send_sms to
app.post("/api/send_sms", async (req, res) => {
  const { recipient, content } = req.body;
  const apiKey = process.env.BREVO_SMS_API_KEY;
  const apiUrl = "https://api.brevo.com/v3/transactionalSMS/sms";

  const smsData = {
    type: "transactional",
    unicodeEnabled: true,
    sender: "LiftInflue",
    recipient,
    content,
  };

  try {
    const resp = await axios
      .post(apiUrl, smsData, {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          Accept: "application/json",
        },
      })
      .then((response) => {
        console.log("SMS sent successfully:", response.data);
        return { success: true, message: "SMS sent successfully" };
      })
      .catch((error) => {
        console.error("Error sending SMS:", error);
        return { success: false, message: `Error sending SMS: ${error}` };
      });
    res.send(resp).status(200);
  } catch (error) {
    console.log("failed to send SMS");
    console.log(error);
    res.send(error).status(500);
  }
});

app.get("/api/send_sms_test", async (req, res) => {
  // const username = 'dev_cent';
  // const email = 'paulinnocent05@gmail.com';
  // await sendSMS(`@${username} with email ${email} has just registered for a free trial. \n+15 portions cevapa kod cesma added.`)
  await sendSMS("Testing sms");
  res.send({ success: true, message: "SMS sent successfully" });
});

app.get("/api/send_email_test", async (req, res) => {
  const email = "paulinnocent05@gmail.com";
  const subject = "Test";
  const content = "<b>hello world</b>";

  send_email(email, subject, content);
  res.send({ success: true, message: "Email sent successfully" });
});

app.post("/api/send_email", async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent);
  res.send({ success: true, message: "Email sent successfully" });
});

app.use("/api/stripe", stripeRoutes);

app.get("/", (req, res) => res.send("Hello World!"));

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
