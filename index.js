
import express from 'express';
import cors from 'cors'
// import axios from 'axios';
import NodeMailer from 'nodemailer'
import dotenv from 'dotenv';
import stripeRoutes from './routes/stripeRoutes.js';
import bodyParser from 'body-parser';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 8000
const app = express()
// app.use(express.urlencoded())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())

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
    { from: "LiftInfluence hello@liftinfluence.com", to, subject, html: content, sender: { name: "LiftInfluence", email: "hello@liftinfluence.com" }, },
    (error, info) => {
      if (error) {
        console.log(error);
        return { success: false, message: error }
      } else {
        console.log("email sent to: " + info.accepted[0]);
        return { success: true, message: info.response }
      }
    }
  )
}


app.post('/api/send_email', async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent)
  res.send({ success: true, message: 'Email sent successfully' })
})






// var Brevo = require('@getbrevo/brevo');
import Brevo from '@getbrevo/brevo'
import axios from 'axios';
// https://developers.brevo.com/reference/sendtransacsms

// var campaignId = 789; // Number | Id of the SMS campaign

// var phoneNumber = new Brevo.SendTestSms(); // SendTestSms | Mobile number of the recipient with the country code. This number must belong to one of your contacts in Brevo account and must not be blacklisted

app.get('/api/send_sms', async (req, res) => {
  const apiKey = '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';
  const apiUrl = 'https://api.brevo.co/sendTransacSms';

  const smsData = {
    sender: 'LiftInfluence', // Alphanumeric sender ID (e.g., "MyApp")
    recipient: '+2348112659304', // Recipient phone number in E.164 format
    content: 'Hello', // SMS content
  };

  // Sending SMS using Brevo's SendTransacSms API
  axios
    .post(apiUrl, smsData, {
      headers: {
        'api-key': apiKey,
      },
    })
    .then((response) => {
      console.log('SMS sent successfully:', response.data);
    })
    .catch((error) => {
      console.error('Error sending SMS:', error);
    });
  res.send({ success: true, message: 'SMS sent successfully' })
})

app.get('/api/send_sms2', async (req, res) => {
  var defaultClient = Brevo.ApiClient.instance;
  const key = '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'

  // Configure API key authorization: api-key
  var apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = key;
  // Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
  apiKey.apiKeyPrefix = 'Token';

  // Configure API key authorization: partner-key
  var partnerKey = defaultClient.authentications['partner-key'];
  partnerKey.apiKey = key;
  // Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
  partnerKey.apiKeyPrefix = 'Token';

  var apiInstance = new Brevo.SMSCampaignsApi();

  const recipients = ['+38631512279', '+2348112659304'];
  for (const recipient of recipients) {
    const sendTransacSms = {
      "sender": "LiftInfluence",
      "recipient": recipient,
      "content": "Test message!",
    };

    apiInstance.sendTransacSms(sendTransacSms).then(function (data) {
      console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function (error) {
      console.error(error);
    });
  }
  res.send({ success: true, message: 'Email sent successfully' })
})









app.post('/api/send_email', async (req, res) => {
  send_email(req.body.email, req.body.subject, req.body.htmlContent)
  res.send({ success: true, message: 'Email sent successfully' })
})

app.use('/api/stripe', stripeRoutes);

app.get('/', (req, res) => res.send('Hello World!'))

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
