import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let product = "unlimited";
  try {
    const body = await request.json();
    if (body?.product === "puzzles") product = "puzzles";
  } catch {
    // no body means the original Unlimited button
  }
  const isPuzzles = product === "puzzles";
  const priceId = isPuzzles ? process.env.STRIPE_PUZZLE_PRICE_ID : process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error("Stripe price id missing for product:", product);
    return NextResponse.json({ error: "This item is not available yet" }, { status: 500 });
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "payment",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      customer_email: user.email,
      "metadata[user_id]": user.id,
      "metadata[product]": isPuzzles ? "puzzles" : "unlimited",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Stripe checkout session error:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }

  const session = await response.json();
  return NextResponse.json({ url: session.url });
}
