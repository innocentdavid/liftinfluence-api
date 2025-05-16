import express from "express";
import cors from "cors";
import NodeMailer from "nodemailer";
import dotenv from "dotenv";
import stripeRoutes, { sendSMS } from "./routes/stripeRoutes.js";
import stripeWebhook from "./routes/stripe-webhook.js";
import bodyParser from "body-parser";
import axios from "axios";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env" });
const PORT = process.env.PORT || 8000;
const app = express();
// app.use(express.urlencoded())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const SCRAPER_API_URL =
  "https://instagram-bulk-profile-scrapper.p.rapidapi.com/clients/api/ig/ig_profile";
const X_RAPID_API_HOST = "instagram-bulk-profile-scrapper.p.rapidapi.com";
const X_RAPID_API_KEY = "47e2a82623msh562f6553fe3aae6p10b5f4jsn431fcca8b82e";

const updateUsersDummyDataCron = async () => {
  console.log("\n\nupdateUsersGraphData cron job started...");
  try {
    var filteredData = [];
    const { data, error } = await supabase
      .from("users")
      .select("id, username, dummyData, status, created_at")
      // .eq("username", "dev_cent")
      .in("status", ["active", "analytics", "checking", "new"])
      .order("created_at", { ascending: false });
    // .eq("username", 'dev_cent');
    // .eq("needsDummyData", true);

    if (error) {
      console.log("updateUsersDummyDataCron: failed to get users");
      console.log(error.message);
      return;
    }

    // data.forEach((user) => {
    //   // console.log(user?.created_at);
    //   const dd = user?.dummyData;
    //   if (dd.length > 0) {
    //     const lastDataPoint = dd[dd.length - 1];
    //     const lastDataPointDate = new Date(lastDataPoint.start_time);
    //     const currentDate = new Date();

    //     if (
    //       lastDataPointDate.getFullYear() === currentDate.getFullYear() &&
    //       lastDataPointDate.getMonth() === currentDate.getMonth() &&
    //       lastDataPointDate.getDate() === currentDate.getDate()
    //     ) {
    //       // console.log(`${user.username}'s last data point is from today.`);
    //     } else {
    //       // console.log(`${user.username}'s last data point is not from today.`);
    //       filteredData.push(user);
    //     }
    //   } else {
    //     console.log(`${user.username} has no dummy data.`);
    //     // dummyGraphGenerator(user);
    //   }
    // });

    // console.log("users that needs Dummy data: " + filteredData.length);
    // return;

    filteredData = data;
    console.log("users that needs graph data: " + filteredData.length);
    // return;

    // await gklsd(data);
    // return;
    // filteredData = data?.filter((user) => user?.dummyData?.length === 0);
    // console.log("users that needs Dummy filteredData: " + filteredData?.length);
    // filteredData.forEach((user) => {
    //   // console.log(user?.created_at);
    //   console.log(user?.dummyData?.length);
    // });

    // try {
    //   for (const i in filteredData) {
    //     if (Object.hasOwnProperty.call(filteredData, i)) {
    //       const user = filteredData[i];
    //       console.log(`processing ${user.username}`);

    //       const r = await dummyGraphGenerator(user);
    //       console.log("r: "+r);
    //     }
    //   }
    // } catch (error) {
    //   console.log(error);
    //   console.log(error.message);
    // }
    // return;

    const requestsPerMinuteLimit = 25;
    let apiRequestCounter = 0;

    let retries = 0;
    const maxRetries = 30;
    const retryDelay = 30000; // 1/2 minute
    // var users = data;
    var users = filteredData;

    while (retries < maxRetries) {
      console.log("retries");
      console.log(retries);
      if (users.length === 0) {
        console.log("No users found");
        break;
      }
      // console.log("usernames");
      // users.forEach((user) => {
      //   console.log(user?.username);
      // });
      // console.log("usernames");

      for (const i in users) {
        console.log("user's list: " + users?.length);

        if (apiRequestCounter >= requestsPerMinuteLimit) {
          // Wait for one minute before making more requests
          await new Promise((resolve) => setTimeout(resolve, 60000));
          apiRequestCounter = 0; // Reset the counter after waiting
        }

        if (Object.hasOwnProperty.call(users, i)) {
          const user = users[i];
          console.log(`processing ${user.username}`);

          const params = {
            ig: user?.username,
            response_type: "short",
            corsEnabled: "false",
            storageEnabled: "true",
          };
          // const params = { ig: filteredSelected, response_type: "short", corsEnabled: "false" };
          const options = {
            method: "GET",
            url: SCRAPER_API_URL,
            params,
            headers: {
              "X-RapidAPI-Key": X_RAPID_API_KEY,
              "X-RapidAPI-Host": X_RAPID_API_HOST,
            },
          };

          const userResults = await axios.request(options);
          apiRequestCounter++;

          const vuser = userResults?.data?.[0];
          if (vuser) {
            const follower_count = vuser.follower_count;
            const following_count = vuser.following_count;

            const currentDate = new Date();
            const date = new Date(currentDate);

            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
              .toString()
              .padStart(2, "0")}-${date
              .getDate()
              .toString()
              .padStart(2, "0")} ${date
              .getHours()
              .toString()
              .padStart(2, "0")}:${date
              .getMinutes()
              .toString()
              .padStart(2, "0")}:${date
              .getSeconds()
              .toString()
              .padStart(2, "0")}.${date
              .getMilliseconds()
              .toString()
              .padStart(6, "0")}`;
            const followers = follower_count;
            // console.log("followers: " + follower_count);

            const dataPoint = {
              profile: {
                followers,
                following: following_count,
                total_interactions: 0,
              },
              start_time: formattedDate,
            };

            const { error } = await supabase
              .from("users")
              .update({
                dummyData: [...(user?.dummyData || []), dataPoint],
              })
              .eq("id", user?.id);

            if (error) {
              console.log("failed to update user's graph data", error);
              console.log(error.message);
            } else {
              console.log(`${user.username} updated successfully`);
              users = users.filter((u) => u.username !== user.username);
            }
          } else {
            console.log("vuser error: ");
            console.log(vuser);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retries++;
    }
  } catch (error) {
    console.log(error);
    console.log(error.message);
  }
  console.log("updateUsersGraphData cron job done\n\n");
};

// updateUsersDummyDataCron();

console.log(
  "updateUsersGraphDataCron Schedule the cron job to run every day at 7am (0 6 * * *)"
);
cron.schedule("0 6 * * *", updateUsersDummyDataCron); // every day at 7am.
// cron.schedule("10 * * * * *", updateUsersDummyDataCron); // every day at 7am.
// console.log("Schedule the cron job to run every day at 8am (0 7 * * *)");
// cron.schedule("0 7 * * *", myCronJob); // every day at 8am.
// cron.schedule("* * * * *", updateUsersDummyDataCron); // every minite
// cron.schedule("* * * * * *", myCronJob); // every second

const transporter = NodeMailer.createTransport({
  host: process.env.SMPT_HOST,
  port: process.env.SMPT_PORT,
  debug: true,
  auth: {
    user: process.env.SMPT_LOGIN,
    pass: process.env.SMPT_KEY,
  },
});

export const send_email = (to, subject, content) => {
  console.log(`to: ${to}, subject: ${subject}`);
  transporter.sendMail(
    {
      from: "LiftInfluence noreply@liftinfluence.com",
      to,
      subject,
      html: content,
      sender: { name: "LiftInfluence", email: "noreply@liftinfluence.com" },
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
  const { email, subject, htmlContent } = req.body;
  // console.log({ email, subject, htmlContent });

  send_email(email, subject, htmlContent);
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
app.post(
  "/api/send_sms",
  express.raw({ type: "application/json" }),
  async (req, res) => {
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
          console.log("Error sending SMS:", error.message);
          return { success: false, message: `Error sending SMS: ${error}` };
        });
      res.send(resp).status(200);
    } catch (error) {
      console.log("failed to send SMS");
      console.log(error);
      res.send(error).status(500);
    }
  }
);

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

// app.post("/api/send_email", async (req, res) => {
//   const { email, subject, htmlContent } = req.body;
//   console.log({ email, subject, htmlContent });

//   send_email(email, subject, htmlContent);
//   res.send({ success: true, message: "Email sent successfully" });
// });

app.use("/api/stripe", stripeRoutes);
app.use("/api/stripe-webhook", stripeWebhook);

app.get("/", (req, res) => res.send("Hello World!"));

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
