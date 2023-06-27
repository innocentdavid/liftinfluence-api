// const express = require('express')
import express from 'express';
// const chargebee = require("chargebee")
import chargebee from 'chargebee'
// CORS is enabled only for demo. Please dont use this in production unless you know about CORS
// const cors = require('cors');
import cors from 'cors'
// const corsOptions = require('./config/corsOptions');
// const { unbilled_charge } = require('chargebee/lib/resources/api_endpoints');
// const { IgApiClient } = require('instagram-private-api');
// import { IgApiClient, IgLoginTwoFactorRequiredError, IgLoginBadPasswordError } from 'instagram-private-api';
// import { IgApiClient } from 'instagram-private-api';
// import Promise from 'bluebird';
// import inquirer from 'inquirer';
import axios from 'axios';

const PORT = process.env.PORT || 8000
// const ig = new IgApiClient();

chargebee.configure({
  site: "sproutysocial",
  // api_key: "live_JtEKTrE7pAsvrOJar1Oc8zhdk5IbvWzE"
  api_key: "live_BW3FVqcdbW4naokDniIcdajdNBWm3MJc1v"
});
const app = express()

app.use(express.urlencoded())
// app.use(cors(corsOptions))
app.use(cors())

// function addDays(days) {
//   var result = new Date();
//   result.setDate(result.getDate() + days);
//   return result;
// }

app.post('/api/notify', async (req, res) => {
  const webhookUrl = req.body.webhookUrl
  axios.post(webhookUrl, {
    text: req.body.message
  }).then(() => {
    res.send({ msg: 'sent!' })
  }).catch((e) => {
    console.log('slack notification error: ', e);
    res.send({ msg: 'error', e })
  })

})

// app.post('/api/checkInstagramPassword', async (req, res) => {
//   const IG_USERNAME = req.body.IG_USERNAME
//   const IG_PASSWORD = req.body.IG_PASSWORD

//   ig.state.generateDevice(IG_USERNAME);

//   try {
//     const loggedInUser = await ig.account.login(IG_USERNAME, IG_PASSWORD);
//     // console.log(loggedInUser);
//     res.send({ success: true, data: loggedInUser })

//   } catch (error) {
//     // console.log(error.response.body);
//     if (error.response.body.error_type === 'two_factor_required') {
//       const { username, totp_two_factor_on, two_factor_identifier } = err.response.body.two_factor_info;
//       // decide which method to use
//       const verificationMethod = totp_two_factor_on ? '0' : '1'; // default to 1 for SMS

//       res.send({ success: false, error: error.response.body, two_factor_identifier, verificationMethod })
//       return;
//     } else {
//       res.send({ success: false, error: error.response.body })
//       return;
//     }
//   }

// })

// app.post('/api/twoFactorLogin', async (req, res) => {
//   const IG_USERNAME = req.body.IG_USERNAME
//   const code = req.body.code
//   const two_factor_identifier = req.body.two_factor_identifier

//   ig.state.generateDevice(IG_USERNAME);
//   try {
//     const r = await ig.account.twoFactorLogin({
//       username: IG_USERNAME,
//       verificationCode: code,
//       twoFactorIdentifier: two_factor_identifier,
//       verificationMethod, // '1' = SMS (default), '0' = TOTP (google auth for example)
//       trustThisDevice: '1', // Can be omitted as '1' is used by default
//     });
//     res.send({ success: true, data: r })
//   } catch (error) {
//     res.send({ success: true, error: error.response.body })
//   }
// })

app.post("/api/generate_checkout_new_url", (req, res) => {
  chargebee.hosted_page.checkout_new_for_items({
    subscription_items:
      [{
        item_price_id: req?.body?.plan_id,
        item_price_price: '9995',
        currency_code: 'USD',
        quantity: 1,
      }]
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
      // res.send(error);
    } else {
      res.send(result.hosted_page);
    }
  });
});

app.post("/api/cancel_for_items", (req, res) => {
  chargebee.subscription.cancel_for_items(req.body.subscription_item_id, {
    end_of_term: false
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
    } else {
      // console.log(result);
      var subscription = result.subscription;
      var customer = result.customer;
      var card = result.card;
      var invoice = result.invoice;
      var unbilled_charges = result.unbilled_charges;
      var credit_notes = result.credit_notes;
      res.send(card, invoice, credit_notes, subscription, customer, unbilled_charges)
    }
  });
});

app.post("/api/create_customer", (req, res) => {
  chargebee.customer.create({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    allow_direct_debit: req.body.allow_direct_debit,
    email: req.body.email,
    // payment_method: {
    //   gateway_account_id : "gw_B8OVRZTUbPV512",
    //   type: "card",
    //   token_id: req.body.token_id
    // }
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log("Error while executing create_customer()");
      console.log(error);
      res.send({ message: 'error', error })
    } else {
      // console.log(result);
      var customer = result.customer;
      // var card = result.card;
      // console.log(card);

      // create payment_source
      chargebee.payment_source.create_using_token({
        customer_id: customer.id,
        token_id: req.body.token_id
      }).request(function (error, result) {
        if (error) {
          //handle error
          console.log("Error while executing payment_source()");
          console.log(error);
          res.send({ message: 'error', error })
        } else {
          // console.log(result);
          var customer = result.customer;
          var payment_source = result.payment_source;
          res.send({ message: 'success', customer, payment_source })
        }
      });
    }
  });
});

app.post("/api/customer_list", (req, res) => {
  chargebee.customer.list({
    limit: 1,
    "email[is]": req.body.email
  }).request(function (error, result) {
    if (error) {
      //handle error
      // console.log(error);
      res.send({})
    } else {
      var customer = {};
      for (var i = 0; i < result.list.length; i++) {
        var entry = result.list[i]
        // console.log(entry);
        customer = entry.customer;
        // var card = entry.card;
      }
      // console.log(customer);
      // console.log(result);
      // const customer = result.customer
      res.send(customer)
    }
  });
});

app.post("/api/create_subscription_for_customer", (req, res) => {
  chargebee.subscription.create_with_items(req.body.customer_id, {
    subscription_items:
      [{
        item_price_id: req?.body?.plan_id,
        item_price_price: '9995',
        currency_code: 'USD',
        quantity: 1,
      }]
  }).request(function (error, result) {
    if (error) {
      //handle error
      // console.log(error);
      res.send({ message: 'error', error })
    } else {
      // console.log(result);
      // var subscription = result.subscription;
      // var customer = result.customer;
      // var card = result.card;
      // var invoice = result.invoice;
      // var unbilled_charges = result.unbilled_charges;
      res.send({ message: 'success', result })
    }
  });
})

app.post("/api/subscription_list", (req, res) => {
  chargebee.subscription.list({
    limit: 1,
    "customer_id[is]": req.body.customer_id,
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
    } else {
      var customer_subscription = {};
      // console.log(result?.list?.[0]?.subscription);
      for (var i = 0; i < result.list.length; i++) {
        var entry = result.list[i]
        customer_subscription = entry.subscription;
      }
      // console.log(customer_subscription);
      res.send(customer_subscription)
    }
  });
});

app.post("/api/pre_cancel", (req, res) => {
  chargebee.hosted_page.pre_cancel({
    // pass_thru_content: "{custom :  {discount_percent: 10}}",
    subscription: {
      // id: "__test__KyVnHhSBWmCoF2tJ"
      // id: "__live__B8NglNTUdZxSWoD"
      id: "B8NglNTUdZxSWoD"
    },
    // cancel_url: 'https//sprouty-social.vercel.app'
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
      // res.send(error);
    } else {
      // console.log(result);
      res.send(result.hosted_page);
    }
  });
});

app.post("/api/generate_checkout_existing_url", (req, res) => {
  chargebee.hosted_page.checkout_existing({
    subscription: {
      // id : "1mhuIhIQhDeD9KFIJ"
      id: req.body.page_id
    },
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
    } else {
      res.send(result.hosted_page);
    }
  });
});

app.post("/api/generate_update_payment_method_url", (req, res) => {
  chargebee.hosted_page.manage_payment_sources({
    customer: {
      id: req.body.customer_id
    },
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
    } else {
      res.send(result.hosted_page);
    }
  });
});

app.post("/api/generate_portal_session", (req, res) => {
  chargebee.portal_session.create({
    customer: {
      id: req.body.customer_id
    },
  }).request(function (error, result) {
    if (error) {
      //handle error
      console.log(error);
    } else {
      res.send(result.portal_session);
    }
  });
});

app.post('/api/generate_payment_intent', (req, res) => {
  chargebee.payment_intent.create(req.body)
    .request(function (error, result) {
      if (error) {
        res.status(error.http_status_code || 500);
        res.json(error);
      } else {
        res.json(result);
      }
    });
});

app.post('/api/retrieve_customer', async (req, res) => {
  const customerId = req.body.customerId
  // console.log(customerId);
  const customer = await chargebee.customer.retrieve(customerId).request().catch(err => {
    return { message: 'error', err }
  })
  if (customer.message === 'error') {
    console.log("err: ");
    console.log(customer?.err);
    res.status(customer?.err?.http_status_code || 500);
    res.json(customer?.err);
    return;
  }
  console.log("customer: ");
  console.log(customer);
  res.json(customer);
});

app.post("/api/create_customer_and_subscription", async (req, res) => {
  const token_id = req.body.token_id
  const customerRes = await create_customer(req.body)
  if (customerRes.message === "success") {
    // console.log(customerRes);
    var customer = customerRes.customer;
    const create_payment_source = await create_payment_source_using_token(token_id, customer?.id)
    if (create_payment_source.message === "success") {
      const createSubscription = await create_subscription(customer?.customer_id, req?.plan_id)
      res.send(createSubscription)
    } else {
      res.send(create_payment_source)
    }
  } else {
    console.log(customerRes);
    // res.send(customerRes)
    res.status(customerRes?.result?.http_status_code || 500);
    res.json(customerRes.result);
  }
});

app.post('/api/updateCustomerPaymentMethod', async (req, res) => {
  const customer_id = req.body.customer_id
  const tmp_token = req.body.token_id
  // console.log(customer_id);
  const customer = await chargebee.customer.update_payment_method(customer_id, {
    payment_method: [{
      type: "card",
      tmp_token
    }]
  }).request().catch(err => {
    return { message: 'error', err }
  })
  if (customer.message === 'error') {
    console.log("err: ");
    console.log(customer?.err);
    res.status(customer?.err?.http_status_code || 500);
    res.json(customer?.err);
    return;
  }
  console.log("customer: ");
  console.log(customer);
  res.json(customer);
});

async function create_customer(body) {
  const result = await chargebee.customer.create({
    first_name: body.first_name,
    last_name: body.last_name,
    allow_direct_debit: body.allow_direct_debit,
    email: body.email,
    payment_method: {
      type: "card",
      token_id: body.token_id
    }
  }).request().catch(err => {
    console.log("Error while executing create_customer()");
    // console.log(err);
    return ({ message: 'error', err })
  })
  if (result.message === 'error') {
    return ({ message: 'error', result })
  } else {
    console.log("result: ");
    console.log(result);
    const { customer } = result
    return ({ message: "success", customer });
  }
}

async function create_payment_source_using_token(token_id, customer_id) {
  console.log(customer_id, token_id);
  const result = await chargebee.payment_source.create_using_token({ customer_id, token_id }).request().catch(err => {
    return ({ message: 'error', err })
  })
  if (result.message === 'error') {
    console.log("Error while executing create_payment_source_using_token()");
    return ({ message: 'error', result })
  }
  const { customer, payment_source } = result
  return ({ message: "success", customer, payment_source });
}

async function create_subscription(customer_id, plan_id) {
  const result = await chargebee.subscription.create_with_items(
    customer_id, {
    subscription_items:
      [{
        item_price_id: plan_id,
        item_price_price: '9995',
        currency_code: 'USD',
        quantity: 1,
      }]
  }
  ).request().catch(err => {
    console.log("Error while executing create_subscription()");
    return ({ message: 'error', err })
  })
  if (result.message === 'error') {
    return ({ message: 'error', result })
  }
  // console.log(result);
  // var subscription = result.subscription;
  // var customer = result.customer;
  // var card = result.card;
  // var invoice = result.invoice;
  // var unbilled_charges = result.unbilled_charges;
  return ({ message: 'success', result });
}





app.get('/', (req, res) => res.send('Hello World!'))

// app.listen(8000, () => console.log('Example app listening on port 8000!'))
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
