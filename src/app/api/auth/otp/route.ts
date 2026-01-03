import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const otpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = otpSchema.parse(body);
    
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP sent to your phone" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
