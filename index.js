
import express from 'express';
import cors from 'cors'
import NodeMailer from 'nodemailer'
import dotenv from 'dotenv';
import stripeRoutes, { sendSMS } from './routes/stripeRoutes.js';
import bodyParser from 'body-parser';
import axios from 'axios';

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
// import Brevo from '@getbrevo/brevo'

// https://developers.brevo.com/reference/sendtransacsms

// var campaignId = 789; // Number | Id of the SMS campaign

// var phoneNumber = new Brevo.SendTestSms(); // SendTestSms | Mobile number of the recipient with the country code. This number must belong to one of your contacts in Brevo account and must not be blacklisted


// send_sms to
app.post('/api/send_sms', async (req, res) => {
  const { recipient, content } = req.body
  const apiKey = process.env.BREVO_SMS_API_KEY;
  const apiUrl = 'https://api.brevo.com/v3/transactionalSMS/sms';

  const smsData = {
    type: 'transactional',
    unicodeEnabled: true,
    sender: 'LiftInflue',
    recipient,
    content
  };

  try {
    const resp = await axios
      .post(apiUrl, smsData, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Accept': 'application/json'
        }
      })
      .then((response) => {
        console.log('SMS sent successfully:', response.data);
        return ({ success: true, message: 'SMS sent successfully' })
      })
      .catch((error) => {
        console.error('Error sending SMS:', error);
        return ({ success: false, message: `Error sending SMS: ${error}` })
      });
    res.send(resp).status(200)
  } catch (error) {
    console.log("failed to send SMS");
    console.log(error);
    res.send(error).status(500)
  }
})

app.get('/api/send_sms_test', async (req, res) => {
  // const username = 'dev_cent';
  // const email = 'paulinnocent05@gmail.com';
  // await sendSMS(`@${username} with email ${email} has just registered for a free trial. \n+15 portions cevapa kod cesma added.`)
  await sendSMS('Testing sms')
  res.send({ success: true, message: 'SMS sent successfully' })
})

app.get('/api/send_email_test', async (req, res) => {
  const email = 'paulinnocent05@gmail.com';
  const subject = 'Test';
  const content = '<b>hello world</b>';

  send_email(email, subject, content)
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
