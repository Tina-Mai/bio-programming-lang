import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	const { id } = params;
	const { key } = await req.json();

	if (!id || !key) {
		return NextResponse.json({ error: "Missing id or key" }, { status: 400 });
	}

	const supabase = createRouteHandlerClient({ cookies });

	const { data, error } = await supabase.from("constraints").update({ key }).eq("id", id).select().single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json(data);
}
