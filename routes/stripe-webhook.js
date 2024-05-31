import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { send_email } from "../index.js";

dotenv.config({ path: ".env" });
const router = express.Router();

const STRIPE_Sk =
  process.env.NODE_ENV === "production"
    ? process.env.STRIPE_SECRET_KEY
    : "sk_test_51NxVGcCnqUVSKo0rhPU4VlKVaQrnoH7ZwWpP2Bzvva3xMmezOAAdRstxilauvNnDfOniwVPdUpWTvJFFIeQsBVle00yZqwFoxq";
const stripe = new Stripe(STRIPE_Sk || "");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

router.get("/", async (req, res) => {
  return res.send("Hello, world");
});

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const body = await req.body;
    const signature = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.NODE_ENV === "production"
          ? process.env.STRIPE_WEBHOOK_SECRET || ""
          : "whsec_b3c2cf13ee9886d2f2ae89bf054726804a317a13305069ccb712ca6801fe4363"
      );
    } catch (error) {
      return res.status(400).json({ message: `${error.message}` });
    }

    const subscription = event?.data?.object;
    if (subscription?.object === "subscription") {
      if (event.type !== "customer.subscription.updated") {
        return res.status(200);
      }

      console.log("event.data.previous_attributes");
      console.log(event.data.previous_attributes);
      console.log("\n");

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("customer_id", subscription.customer)
        .single();

      const currentPeriodEndChanged =
        "current_period_end" in event.data.previous_attributes;
      const cancelAtChanged = "cancel_at" in event.data.previous_attributes;
      const cancelAtPeriodEndChanged =
        "cancel_at_period_end" in event.data.previous_attributes;
      let e;
      if (
        currentPeriodEndChanged &&
        !cancelAtChanged &&
        !cancelAtPeriodEndChanged
      ) {
        console.log("The subscription has been renewed.");
        e = "renew";
      } else {
        console.log("The subscription has been cancelled.");
        try {
          send_email(
            "hello@liftinfluence.com",
            "Subscription cancellation",
            `${user?.username} cancelled their subscription`
          );
        } catch (error) {
          console.log(
            "Failed to send email to hello@liftinfluence.com about cancellation"
          );
        }
        e = "cancelled";
      }
      if (["renew", "cancelled"].includes(e)) {
        if (
          user?.id &&
          subscription.status !== "cancelled" &&
          user.status === "active"
        ) {
          console.log(`subscription.status, user.status`);
          console.log(subscription.status, user.status);
          return res.status(200);
        }

        console.log(
          "prevstatus: ",
          subscription.cancel_at_period_end &&
            (subscription.status === "active" ||
              subscription.status === "trialing")
            ? "new"
            : "cancelled"
        );
        console.log(
          subscription.customer +
            "'s subscription status is: " +
            subscription.status
        );

        const { error, data } = await supabaseAdmin
          .from("users")
          .update({
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscribed:
              !subscription.cancel_at_period_end &&
              (subscription.status === "active" ||
                subscription.status === "trialing")
                ? true
                : false,
            status:
              !subscription.cancel_at_period_end &&
              (subscription.status === "active" ||
                subscription.status === "trialing")
                ? "new"
                : "cancelled",
            subscription_updated_at: new Date(),
          })
          .eq("customer_id", subscription.customer)
          .select("*")
          .single();

        if (error || !data) {
          console.log(error.message);
          return res.status(404).json({ message: error.message });
        }

        return res.status(200);
      }

      return res.status(200);
    } else if (event) {
      return res
        .status(306)
        .json({ message: `Unhandled event: ${event.type}` });
    }
    return res.status(500).json({ message: `something went wrong` });
  }
);

export default router;
