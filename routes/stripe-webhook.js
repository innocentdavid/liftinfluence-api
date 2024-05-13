import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (error) {
      return res.status(400).json({ message: `${error.message}` });
    }

    const subscription = event?.data?.object;
    if (subscription?.object === "subscription") {
      console.log(
        subscription.customer +
          "'s subscription status is: " +
          subscription.status
      );
      console.log(
        "status: ",
        subscription.cancel_at_period_end &&
          (subscription.status === "active" ||
            subscription.status === "trialing")
          ? "new"
          : "cancelled"
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
    } else if (event) {
      return res
        .status(306)
        .json({ message: `Unhandled event: ${event.type}` });
    }
    return res.status(500).json({ message: `something went wrong` });
  }
);

export default router;
