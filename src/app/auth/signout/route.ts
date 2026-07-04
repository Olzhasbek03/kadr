import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { config } from "@/lib/config";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", config.appUrl), { status: 303 });
}
